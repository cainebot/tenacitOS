'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { TaskMessageRow } from '@/types/project'

export interface UseRealtimeTaskMessagesResult {
  messages: TaskMessageRow[]
  loading: boolean
}

export function useRealtimeTaskMessages(cardId: string | null): UseRealtimeTaskMessagesResult {
  const [messages, setMessages] = useState<TaskMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  const fetchMessages = useCallback(async () => {
    if (!cardId) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)

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
    setLoading(false)
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
    let channels: ReturnType<typeof supabase.channel>[] = []
    let cancelled = false

    async function setupSubscriptions() {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('card_id', cardId!)

      if (cancelled) return
      const taskIds = (tasks ?? []).map((t: { task_id: string }) => t.task_id)

      for (const taskId of taskIds) {
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
              if (!cancelled) {
                setMessages((prev) => [...prev, payload.new as TaskMessageRow])
              }
            }
          )
          .subscribe()
        channels.push(channel)
      }
    }

    setupSubscriptions()

    return () => {
      cancelled = true
      for (const ch of channels) {
        supabase.removeChannel(ch)
      }
      channels = []
    }
  }, [fetchMessages, supabase, cardId])

  return { messages, loading }
}
