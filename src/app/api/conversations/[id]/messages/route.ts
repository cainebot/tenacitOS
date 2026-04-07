import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/conversations/{id}/messages?cursor={created_at}&limit={50}
// Returns paginated messages with sender info, newest-first
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)

  const supabase = createServerClient()

  // Verify user is participant (RLS handles this, but explicit check for 404)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const next_cursor = messages.length === limit
    ? messages[messages.length - 1].created_at
    : null

  return NextResponse.json({ data: messages, next_cursor })
}

// POST /api/conversations/{id}/messages
// Body: { text: string, content_type?: ContentType }
// Returns: created message row
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const content_type = body.content_type || 'text'

  // Use service role to INSERT (messages INSERT policy is service_role only per RLS)
  const serviceClient = createServiceRoleClient()

  // Per D-02: sender_id = auth.uid() which is the human participant_id
  const { data, error } = await serviceClient
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
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
