'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { TaskMessageRow } from '@/types/project'

export interface UseRealtimeTaskMessagesResult {
  messages: TaskMessageRow[]
  loading: boolean
}

/**
 * Type guard to validate that a Realtime payload matches TaskMessageRow shape.
 * Protects against partial replication or future column changes.
 */
function isTaskMessageRow(val: unknown): val is TaskMessageRow {
  const r = val as Record<string, unknown>
  return (
    typeof r?.id === 'string' &&
    typeof r?.task_id === 'string' &&
    typeof r?.message_type === 'string'
  )
}

export function useRealtimeTaskMessages(cardId: string | null): UseRealtimeTaskMessagesResult {
  const [messages, setMessages] = useState<TaskMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  // createBrowserClient() returns a singleton, but memoize to guarantee stable reference
  // for useCallback/useEffect dependency arrays.
  const supabase = useMemo(() => createBrowserClient(), [])

  const fetchMessages = useCallback(async () => {
    if (!cardId) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)

    try {
      // Step 1: Get task_ids for this card
      const { data: tasks } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('card_id', cardId)

      const taskIds = (tasks ?? []).map((t: { task_id: string }) => t.task_id)

      if (taskIds.length === 0) {
        setMessages([])
        setLoading(false)
        return
      }

      // Step 2: Fetch all messages for those tasks
      const { data } = await supabase
        .from('task_messages')
        .select('*')
        .in('task_id', taskIds)
        .order('seq', { ascending: true })

      setMessages((data as TaskMessageRow[]) ?? [])
    } catch (err) {
      console.error('[use-realtime-task-messages] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, cardId])

  useEffect(() => {
    if (!cardId) {
      setMessages([])
      setLoading(false)
      return
    }

    fetchMessages()

    // Subscribe to task_messages for this card's tasks
    // We use a card-scoped approach: first get tasks, then subscribe per task
    let alive = true
    const activeChannels: ReturnType<typeof supabase.channel>[] = []

    async function setupSubscriptions() {
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('task_id')
          .eq('card_id', cardId!)

        if (!alive) return
        const taskIds = (tasks ?? []).map((t: { task_id: string }) => t.task_id)

        for (const taskId of taskIds) {
          if (!alive) return
          const channel = supabase
            .channel(`task-messages-${taskId}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'task_messages',
                filter: `task_id=eq.${taskId}`,
              },
              (payload) => {
                if (alive && isTaskMessageRow(payload.new)) {
                  setMessages((prev) => [...prev, payload.new as TaskMessageRow])
                }
              }
            )
            .subscribe()
          activeChannels.push(channel)
        }
      } catch (err) {
        console.error('[use-realtime-task-messages] subscription setup failed:', err)
      }
    }

    setupSubscriptions()

    return () => {
      alive = false
      // Drain all channels created so far. Any channels that would be created
      // after this point are impossible because alive===false guards above.
      for (const ch of activeChannels) {
        supabase.removeChannel(ch)
      }
    }
  }, [fetchMessages, supabase, cardId])

  return { messages, loading }
}
