'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useMyParticipant } from '@/contexts/my-participant-context'
import type { ConversationType } from '@/types/chat'

export interface ConversationWithMeta {
  conversation_id: string
  conversation_type: 'direct' | 'broadcast' | 'group'
  title: string | null
  last_message_at: string | null
  last_message_text: string | null
  unread_count: number
  agent_name?: string
  agent_avatar?: string
}

/**
 * Fetches all conversations the current user participates in using the browser
 * Supabase client directly (avoids API route auth issues — the browser client
 * has the auth session, RLS filters to own conversations automatically).
 */
export function useConversations() {
  const { participant, loading: participantLoading } = useMyParticipant()
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!participant) return
    const supabase = createBrowserClient()
    const myId = participant.participant_id

    try {
      // RLS on conversations filters to own conversations via conversation_participants
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('conversation_id, conversation_type, title, last_message_at')
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (convErr) {
        setError('Could not load conversations. Check your connection and try again.')
        setLoading(false)
        return
      }

      const results: ConversationWithMeta[] = await Promise.all(
        (convs ?? []).map(async (conv) => {
          // Latest message text
          const { data: latestMsg } = await supabase
            .from('messages')
            .select('text')
            .eq('conversation_id', conv.conversation_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Unread count: messages from others without a 'read' receipt from me
          const { data: unreadMsgs } = await supabase
            .from('messages')
            .select('message_id')
            .eq('conversation_id', conv.conversation_id)
            .neq('sender_id', myId)
            .is('deleted_at', null)

          let unreadCount = 0
          if (unreadMsgs && unreadMsgs.length > 0) {
            const msgIds = unreadMsgs.map((m) => m.message_id)
            const { data: readReceipts } = await supabase
              .from('message_receipts')
              .select('message_id')
              .in('message_id', msgIds)
              .eq('participant_id', myId)
              .eq('status', 'read')

            const readIds = new Set((readReceipts ?? []).map((r) => r.message_id))
            unreadCount = msgIds.filter((id) => !readIds.has(id)).length
          }

          // For DMs, resolve the other participant's name + avatar
          let agentName: string | undefined
          let agentAvatar: string | undefined

          if (conv.conversation_type === 'direct') {
            const { data: otherParts } = await supabase
              .from('conversation_participants')
              .select('participant_id')
              .eq('conversation_id', conv.conversation_id)
              .neq('participant_id', myId)
              .limit(1)

            if (otherParts && otherParts.length > 0) {
              const { data: profile } = await supabase
                .from('chat_participants')
                .select('display_name, avatar_url')
                .eq('participant_id', otherParts[0].participant_id)
                .maybeSingle()

              if (profile) {
                agentName = profile.display_name
                agentAvatar = profile.avatar_url ?? undefined
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
          }
        })
      )

      setConversations(results)
      setError(null)
    } catch {
      setError('Could not load conversations. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [participant])

  // Initial fetch when participant is available
  useEffect(() => {
    if (participantLoading) return
    if (!participant) {
      setLoading(false)
      return
    }
    fetchConversations()
  }, [participant, participantLoading, fetchConversations])

  // Realtime subscription: re-fetch on conversation changes
  useEffect(() => {
    if (!participant) return
    const supabase = createBrowserClient()
    const channel = supabase.channel('chat-conversations-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        fetchConversations()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [participant, fetchConversations])

  // Split into channels (broadcast + group) and dms (direct)
  const channels = conversations.filter(
    c => c.conversation_type === 'broadcast' || c.conversation_type === 'group'
  )
  const dms = conversations.filter(c => c.conversation_type === 'direct')
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  return { channels, dms, totalUnread, loading, error, refetch: fetchConversations }
}
