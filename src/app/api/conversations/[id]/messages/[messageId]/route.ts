import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/conversations/{id}/messages/{messageId}
// Returns a single message with JOINed attachments + fresh signed URLs.
// Uses service_role (middleware mc_auth already verifies auth).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id: conversationId, messageId } = await params
  const supabase = createServiceRoleClient()

  // Fetch message with JOINed attachments + sender info
  const { data: message, error } = await supabase
    .from('messages')
    .select(`
      *,
      attachments:message_attachments(*),
      sender:chat_participants!sender_id(participant_id, display_name, avatar_url)
    `)
    .eq('message_id', messageId)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .single()

  if (error || !message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Refresh signed URLs for attachments (1-hour expiry)
  if (message.attachments && message.attachments.length > 0) {
    const paths = message.attachments.map((a: { storage_path: string }) => a.storage_path)
    const { data: signedUrls } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrls(paths, 3600)

    if (signedUrls) {
      const urlMap = new Map<string, string>()
      paths.forEach((p: string, i: number) => {
        if (signedUrls[i]?.signedUrl) urlMap.set(p, signedUrls[i].signedUrl)
      })

      message.attachments = message.attachments.map((a: { storage_path: string; url: string }) => ({
        ...a,
        url: urlMap.get(a.storage_path) ?? a.url,
      }))
    }
  }

  return NextResponse.json({ data: message })
}
