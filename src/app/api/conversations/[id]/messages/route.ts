import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { mimeToContentType } from '@/lib/format'

export const dynamic = 'force-dynamic'

// Helper: resolve Joan's participant_id (single human participant)
async function getJoanParticipantId(supabase: ReturnType<typeof createServiceRoleClient>) {
  const { data } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .limit(1)
    .single()
  return data?.participant_id ?? null
}

// GET /api/conversations/{id}/messages?cursor={created_at}&limit={50}
// Returns paginated messages with sender info, newest-first
// Uses service_role (middleware mc_auth already verifies auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)

  const supabase = createServiceRoleClient()

  // Fetch messages with sender info via join
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:chat_participants!sender_id(display_name, avatar_url),
      attachments:message_attachments(*),
      receipts:message_receipts(*),
      reactions:message_reactions(*)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const messages = data ?? []

  // Refresh signed URLs for all attachments (1-hour expiry)
  const allAttachments = messages.flatMap((m: any) => m.attachments ?? [])

  if (allAttachments.length > 0) {
    const serviceClient = createServiceRoleClient()
    const paths = allAttachments.map((a: any) => a.storage_path)
    const { data: signedUrls } = await serviceClient.storage
      .from('chat-attachments')
      .createSignedUrls(paths, 3600)

    if (signedUrls) {
      // Build lookup map: storage_path -> signed URL
      const urlMap = new Map<string, string>()
      paths.forEach((p: string, i: number) => {
        if (signedUrls[i]?.signedUrl) urlMap.set(p, signedUrls[i].signedUrl)
      })

      // Replace stale URLs in message attachments
      for (const msg of messages) {
        if (msg.attachments) {
          msg.attachments = msg.attachments.map((a: any) => ({
            ...a,
            url: urlMap.get(a.storage_path) ?? a.url,
          }))
        }
      }
    }
  }

  const next_cursor = messages.length === limit
    ? messages[messages.length - 1].created_at
    : null

  return NextResponse.json({ data: messages, next_cursor })
}

// POST /api/conversations/{id}/messages
// Supports two Content-Types:
//   application/json — { text, content_type?, parent_message_id?, skill_id?, skill_command? }
//   multipart/form-data — text + files[] (with optional parent_message_id)
// Returns: created message row (+ attachments array for multipart)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = createServiceRoleClient()

  const senderId = await getJoanParticipantId(supabase)
  if (!senderId) {
    return NextResponse.json({ error: 'Human participant not found' }, { status: 404 })
  }

  const contentTypeHeader = request.headers.get('content-type') ?? ''

  if (contentTypeHeader.includes('multipart/form-data')) {
    // ── Multipart path: file attachments ─────────────────────────────────────
    const formData = await request.formData()
    const text = (formData.get('text') as string | null)?.trim() ?? ''
    const files = formData.getAll('files') as File[]
    const parentMessageId = formData.get('parent_message_id') as string | null

    // Server-side 25MB limit per file
    const MAX_FILE_SIZE = 25 * 1024 * 1024
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 25MB limit` },
          { status: 413 }
        )
      }
    }

    // Must have text or files
    if (!text && files.length === 0) {
      return NextResponse.json({ error: 'text or files required' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Pre-generate message_id for Storage path construction
    const messageId = crypto.randomUUID()

    // Derive content_type from first file's MIME type
    const contentType = files.length > 0
      ? mimeToContentType(files[0].type)
      : 'text'

    // Upload each file to Storage
    const attachmentRows: Array<{
      message_id: string
      storage_path: string
      url: string
      filename: string
      size_bytes: number
      mime_type: string
    }> = []

    for (const file of files) {
      const storagePath = `${conversationId}/${messageId}/${file.name}`

      const { error: uploadError } = await serviceClient.storage
        .from('chat-attachments')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        // Cleanup already-uploaded files on failure
        for (const prev of attachmentRows) {
          await serviceClient.storage
            .from('chat-attachments')
            .remove([prev.storage_path])
            .catch(() => {}) // log but don't throw on cleanup
        }
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      // Generate signed URL (1-hour expiry)
      const { data: signedData } = await serviceClient.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 3600)

      attachmentRows.push({
        message_id: messageId,
        storage_path: storagePath,
        url: signedData?.signedUrl ?? '',
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
      })
    }

    // INSERT message row with explicit message_id
    const { data: msgData, error: msgError } = await serviceClient
      .from('messages')
      .insert({
        message_id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content_type: contentType,
        text: text || null,
        parent_message_id: parentMessageId || null,
      })
      .select()
      .single()

    if (msgError) {
      // Cleanup Storage objects if DB insert fails
      for (const att of attachmentRows) {
        await serviceClient.storage
          .from('chat-attachments')
          .remove([att.storage_path])
          .catch(() => {})
      }
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // INSERT attachment rows
    if (attachmentRows.length > 0) {
      const { error: attError } = await serviceClient
        .from('message_attachments')
        .insert(attachmentRows)

      if (attError) {
        return NextResponse.json({ error: attError.message }, { status: 500 })
      }
    }

    return NextResponse.json(
      { ...msgData, attachments: attachmentRows },
      { status: 201 }
    )
  } else {
    // ── JSON path: text-only messages (unchanged) ─────────────────────────────
    const body = await request.json()
    const text = body.text?.trim()
    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const content_type = body.content_type || 'text'

    // Use service role to INSERT (messages INSERT policy is service_role only per RLS)
    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content_type,
        text,
        parent_message_id: body.parent_message_id || null,
        skill_id: body.skill_id || null,
        skill_command: body.skill_command || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
}
