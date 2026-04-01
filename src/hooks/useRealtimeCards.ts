'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

export function useRealtimeCards(
  boardId: string,
  onCardChange: (payload: RealtimePayload) => void
): void {
  // Use a ref for the callback to avoid re-subscribing when callback changes
  const callbackRef = useRef(onCardChange)
  callbackRef.current = onCardChange

  // Debounce timer ref — batches rapid realtime events into a single callback
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!boardId) return

    const supabase = createBrowserClient()
    const channelName = `cards-board-${boardId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
          const realtimePayload: RealtimePayload = {
            eventType,
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: (payload.old ?? {}) as Record<string, unknown>,
          }

          // Debounce: clear any pending timer and schedule a new 300ms callback
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = setTimeout(() => {
            callbackRef.current(realtimePayload)
            debounceTimerRef.current = null
          }, 300)
        }
      )
      .subscribe()

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [boardId])
}
