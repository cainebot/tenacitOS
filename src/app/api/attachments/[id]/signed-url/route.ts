import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

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

// GET /api/attachments/{id}/signed-url
// Returns a fresh signed URL for a single attachment by attachment_id.
// Verifies caller is a participant in the attachment's conversation.
// Used by ImageBubble onError to refresh stale signed URLs (D-01, D-02).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Look up the attachment's storage path, joining through messages to get conversation_id
  const { data, error } = await supabase
    .from('message_attachments')
    .select(`
      storage_path, filename, mime_type,
      messages!inner(conversation_id)
    `)
    .eq('attachment_id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  // Verify Joan is a participant in the attachment's conversation (Gap 1 — IDOR mitigation)
  const joanId = await getJoanParticipantId(supabase)
  if (!joanId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const messages = data.messages as { conversation_id: string } | null
  if (!messages?.conversation_id) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }
  const conversationId = messages.conversation_id
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('participant_id')
    .eq('conversation_id', conversationId)
    .eq('participant_id', joanId)
    .single()

  if (!participant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Generate a fresh signed URL — 1-hour TTL matching existing pattern
  const { data: signedData, error: signedError } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(data.storage_path, 3600)

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signedData.signedUrl })
}
