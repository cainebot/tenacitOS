/**
 * @deprecated Phase 89: Legacy hook replaced by useAgentChat (use-agent-chat.ts).
 * Kept functional during v4.0 transition period per D-03.
 * Will be removed at end of v4.0 per D-06.
 *
 * New code should use:
 *   import { useAgentChat } from '@/hooks/use-agent-chat'
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AgentMessageRow } from '@/types/supabase'

interface UseRealtimeMessagesOptions {
  agentId: string
  topic: string
}

interface UseRealtimeMessagesResult {
  messages: AgentMessageRow[]
  loading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  markAsRead: (messageIds: string[]) => Promise<void>
}

export function useRealtimeMessages({ agentId, topic }: UseRealtimeMessagesOptions): UseRealtimeMessagesResult {
  const [messages, setMessages] = useState<AgentMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<string | null>(null)
  const supabase = createBrowserClient()

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/messages?topic=${encodeURIComponent(topic)}&limit=50`)
      if (!res.ok) throw new Error('Failed to load messages')
      const json = await res.json()
      // API returns newest-first, reverse for display (oldest at top)
      setMessages((json.data as AgentMessageRow[]).reverse())
      cursorRef.current = json.next_cursor ?? null
      setHasMore(!!json.next_cursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [agentId, topic])

  // Load more (older messages)
  const loadMore = useCallback(async () => {
    if (!cursorRef.current) return
    try {
      const res = await fetch(
        `/api/agents/${agentId}/messages?topic=${encodeURIComponent(topic)}&cursor=${cursorRef.current}&limit=50`
      )
      if (!res.ok) throw new Error('Failed to load more')
      const json = await res.json()
      const older = (json.data as AgentMessageRow[]).reverse()
      setMessages((prev) => [...older, ...prev])
      cursorRef.current = json.next_cursor ?? null
      setHasMore(!!json.next_cursor)
    } catch {
      // silently fail on load-more
    }
  }, [agentId, topic])

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      const res = await fetch(`/api/agents/${agentId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, topic }),
      })
      if (!res.ok) throw new Error('Send failed')
      // Realtime will deliver the message back — no need to manually add
    },
    [agentId, topic]
  )

  // Mark as read
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return
      await fetch(`/api/agents/${agentId}/messages/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: messageIds }),
      }).catch(() => {})
    },
    [agentId]
  )

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`messages-${agentId}-${topic}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_messages' },
        (payload) => {
          const newMsg = payload.new as AgentMessageRow
          // Filter: only messages for this agent+topic
          if (
            (newMsg.recipient_agent_id === agentId ||
              (newMsg.sender_type === 'agent' && newMsg.sender_id === agentId)) &&
            newMsg.topic === topic
          ) {
            setMessages((prev) => {
              // Deduplicate by message_id
              if (prev.some((m) => m.message_id === newMsg.message_id)) return prev
              return [...prev, newMsg]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agent_messages' },
        (payload) => {
          const updated = payload.new as AgentMessageRow
          setMessages((prev) =>
            prev.map((m) => (m.message_id === updated.message_id ? updated : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId, topic, fetchMessages, supabase])

  return { messages, loading, error, sendMessage, loadMore, hasMore, markAsRead }
}
