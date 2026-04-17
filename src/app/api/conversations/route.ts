import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import type { ConversationType } from '@/types/chat'

export const dynamic = 'force-dynamic'

export interface ConversationWithMeta {
  conversation_id: string
  conversation_type: ConversationType
  title: string | null
  last_message_at: string | null
  last_message_text: string | null
  unread_count: number
  agent_name?: string
  agent_avatar?: string
  agent_id?: string
}

// GET /api/conversations
// Returns Joan's conversations sorted by last_message_at DESC
// with unread counts and last message preview.
// Uses service_role — middleware mc_auth cookie already verifies auth.
export async function GET() {
  const supabase = createServiceRoleClient()

  // Resolve Joan's participant_id (single human participant)
  const { data: joanRow, error: joanError } = await supabase
    .from('chat_participants')
    .select('participant_id')
    .eq('participant_type', 'human')
    .limit(1)
    .single()

  if (joanError || !joanRow) {
    // No participant record yet — return empty list
    return NextResponse.json([])
  }

  const joanParticipantId = joanRow.participant_id

  // Step 1: Get all conversation_ids Joan is a participant in
  const { data: participations, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('participant_id', joanParticipantId)

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 })
  }

  if (!participations || participations.length === 0) {
    return NextResponse.json([])
  }

  const conversationIds = participations.map((p) => p.conversation_id)

  // Step 2: Fetch all conversations ordered by last_message_at DESC
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('conversation_id, conversation_type, title, last_message_at, context_type, context_id')
    .in('conversation_id', conversationIds)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json([])
  }

  // Step 3: For each conversation, get unread count (messages from others with no read receipt)
  // and last message text
  const results: ConversationWithMeta[] = await Promise.all(
    conversations.map(async (conv) => {
      // Fetch latest message text
      const { data: latestMsg } = await supabase
        .from('messages')
        .select('text, created_at')
        .eq('conversation_id', conv.conversation_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Count unread: messages from others that have no 'read' receipt for Joan.
      // Exclude placeholder messages with neither text nor attachments — these
      // are orphan streaming rows (Phase 102) whose follow-up UPDATE with tokens
      // never persisted. They are invisible to the user (the UI filters them
      // out in chat-view-panel.tsx) and must not count toward the badge.
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('message_id, text, message_attachments(attachment_id)')
        .eq('conversation_id', conv.conversation_id)
        .neq('sender_id', joanParticipantId)
        .is('deleted_at', null)

      let unreadCount = 0
      if (unreadMessages && unreadMessages.length > 0) {
        // Post-fetch filter: keep only messages with non-empty text OR at least
        // one attachment. The embedded join with message_attachments returns an
        // array; a zero-length array means no attachments.
        const visibleMessages = unreadMessages.filter((m) => {
          const hasText = typeof m.text === 'string' && m.text.length > 0
          const attachments = (m as unknown as { message_attachments?: unknown[] }).message_attachments
          const hasAttachments = Array.isArray(attachments) && attachments.length > 0
          return hasText || hasAttachments
        })
        if (visibleMessages.length > 0) {
          const msgIds = visibleMessages.map((m) => m.message_id)
          const { data: readReceipts } = await supabase
            .from('message_receipts')
            .select('message_id')
            .in('message_id', msgIds)
            .eq('participant_id', joanParticipantId)
            .eq('status', 'read')

          const readIds = new Set((readReceipts ?? []).map((r) => r.message_id))
          unreadCount = msgIds.filter((id) => !readIds.has(id)).length
        }
      }

      // For direct conversations, resolve the other participant's name, avatar + agent_id
      let agentName: string | undefined
      let agentAvatar: string | undefined
      let agentId: string | undefined

      if (conv.conversation_type === 'direct') {
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('participant_id')
          .eq('conversation_id', conv.conversation_id)
          .neq('participant_id', joanParticipantId)
          .limit(1)

        if (otherParticipants && otherParticipants.length > 0) {
          const { data: otherProfile } = await supabase
            .from('chat_participants')
            .select('display_name, avatar_url, external_id')
            .eq('participant_id', otherParticipants[0].participant_id)
            .maybeSingle()

          if (otherProfile) {
            agentName = otherProfile.display_name
            agentAvatar = otherProfile.avatar_url ?? undefined
            agentId = otherProfile.external_id ?? undefined
          }
        }
      }

      return {
        conversation_id: conv.conversation_id,
        conversation_type: conv.conversation_type as ConversationType,
        title: conv.title,
        last_message_at: conv.last_message_at,
        last_message_text: latestMsg?.text ?? null,
        unread_count: unreadCount,
        ...(agentName ? { agent_name: agentName } : {}),
        ...(agentAvatar ? { agent_avatar: agentAvatar } : {}),
        ...(agentId ? { agent_id: agentId } : {}),
      }
    })
  )

  return NextResponse.json(results)
}
