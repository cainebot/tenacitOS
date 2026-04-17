'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useMyParticipant } from '@/contexts/my-participant-context'

export interface ConversationWithMeta {
  conversation_id: string
  conversation_type: 'direct' | 'broadcast' | 'group'
  title: string | null
  last_message_at: string | null
  last_message_text: string | null
  unread_count: number
  agent_name?: string
  agent_avatar?: string
  agent_id?: string
}

/**
 * Fetches conversations via /api/conversations (service_role, bypasses RLS).
 * Falls back gracefully when Supabase browser auth is unavailable.
 */
export function useConversations() {
  const { participant, loading: participantLoading } = useMyParticipant()
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) {
        setError('Could not load conversations. Check your connection and try again.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setConversations(data)
      setError(null)
    } catch {
      setError('Could not load conversations. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_receipts',
        filter: `participant_id=eq.${participant.participant_id}`,
      }, () => {
        // Refetch when own receipts change (delivered/read) so the per-conversation
        // and global unread badges decrement in real-time without waiting for a
        // conversations-row touch.
        fetchConversations()
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        // New inbound message → increment unread badges immediately. Without
        // this the sidebar only refreshes when the `conversations` row is
        // touched, which can lag behind the message insert by seconds.
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
