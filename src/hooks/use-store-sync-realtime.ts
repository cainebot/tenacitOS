'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useBoardStore } from '@/stores/board-store'
import type { CardRow } from '@/types/project'

/**
 * useStoreSyncRealtime — store-aware Realtime subscription hook.
 *
 * Subscribes to Supabase Realtime postgres_changes on the `cards` table.
 *
 * - UPDATE deltas are patched in-memory via syncFromServer() — no HTTP round-trip
 *   (syncFromServer's pendingMutations guard drops deltas silently during drags — RT-02)
 * - INSERT/DELETE events trigger a full board refetch (card count changed)
 * - Cleanup removes channel on boardId change or unmount — no subscription leaks (RT-03)
 * - 300ms debounce batches rapid events from agent burst operations
 */
export function useStoreSyncRealtime(
  boardId: string,
  refetch: () => Promise<void>,
): void {
  // Ref for refetch callback — avoids re-subscribing when callback identity changes
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  // Debounce timer ref — batches rapid realtime events into a single handler call
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!boardId) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`cards-board-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'

          // Debounce: clear any pending timer and schedule a new 300ms callback
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null

            if (eventType === 'UPDATE') {
              const updatedCard = payload.new as CardRow

              // Access store state without subscribing (avoids React re-renders in hook)
              const store = useBoardStore.getState()

              // Board membership check — card may belong to a different board
              const cardBelongsHere = store.columns.some(
                (col) => col.items.some((c) => c.card_id === updatedCard.card_id),
              )
              if (!cardBelongsHere) return

              // Step 1: Remove card from whichever column it currently lives in
              const withoutCard = store.columns.map((col) => ({
                ...col,
                items: col.items.filter((c) => c.card_id !== updatedCard.card_id),
              }))

              // Step 2: Find target column by state_id
              const targetCol = withoutCard.find((col) => col.stateId === updatedCard.state_id)
              if (!targetCol) return // state_id not on this board

              // Step 3: Insert the updated card into target column, sorted by sort_order
              const patchedColumns = withoutCard.map((col) =>
                col.columnId === targetCol.columnId
                  ? {
                      ...col,
                      items: [...col.items, updatedCard].sort((a, b) =>
                        a.sort_order < b.sort_order ? -1 : a.sort_order > b.sort_order ? 1 : 0,
                      ),
                    }
                  : col,
              )

              // syncFromServer's pendingMutations guard silently drops delta if drag is in flight (RT-02)
              store.syncFromServer(patchedColumns)
            } else {
              // INSERT or DELETE: card count changed — full board reload is the safe fallback
              refetchRef.current()
            }
          }, 300)
        },
      )
      .subscribe()

    return () => {
      // Cleanup — clear debounce timer and remove channel (RT-03: no subscription leaks)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [boardId])
}
