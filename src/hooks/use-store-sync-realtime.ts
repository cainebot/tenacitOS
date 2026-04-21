'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useBoardStore } from '@/stores/board-store'
import { isBoardDragActive } from '@/components/application/kanban-board'
import type { CardRow } from '@/types/project'

/**
 * useStoreSyncRealtime — store-aware Realtime subscription hook.
 *
 * Subscribes to Supabase Realtime postgres_changes on the `cards` table.
 *
 * - UPDATE deltas patch non-positional fields in-place without touching sort_order or
 *   column position. This prevents realtime echoes of our own drag mutations from
 *   overwriting optimistic state (B2 fix: mutation echo suppressor + in-place patch).
 * - Cross-column moves from external sources (different state_id) are allowed through
 *   only when the card was NOT recently moved by this client.
 * - INSERT/DELETE events trigger a full board refetch (card count changed)
 * - Cleanup removes channel on boardId change or unmount — no subscription leaks (RT-03)
 * - 80ms debounce batches rapid events from agent burst operations
 *
 * @deprecated (Phase 73) Board position correctness now comes from useBoardSyncEngine
 * (sync_events channel). This hook is kept for non-positional metadata patches
 * (title, description, labels, priority, assignee, due_date) and INSERT/DELETE
 * refetch triggers. The positional echo-suppression logic in this hook is still
 * valuable for card metadata updates.
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

  // Mutation echo suppressor — tracks card IDs that were recently moved by this client.
  // When a realtime UPDATE arrives for a card in this Set, we skip the positional update
  // (it's just an echo of our own mutation). Entries auto-expire after 2 seconds.
  const recentlyMovedCards = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!boardId) return

    // Expose a way for the store's moveCard to register echoes.
    // We attach to the store's moveCard by wrapping it via a side-channel ref.
    // The store calls registerEcho(cardId) when a move is initiated.
    const suppressEcho = (cardId: string) => {
      // Clear any existing timer for this card before setting a new one
      const existing = recentlyMovedCards.current.get(cardId)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        recentlyMovedCards.current.delete(cardId)
      }, 2000)
      recentlyMovedCards.current.set(cardId, timer)
    }

    // Register the suppressor on the store so moveCard can call it
    useBoardStore.getState().registerEchoSuppressor(suppressEcho)

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`cards-board-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'

          // Debounce: clear any pending timer and schedule a new 80ms callback
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null

            // PERF-04: Skip all store patches during active drag — prevents periodic
            // DOM mutation bursts from Realtime events competing with drag state.
            if (isBoardDragActive()) return

            if (eventType === 'UPDATE') {
              const updatedCard = payload.new as CardRow

              // Access store state without subscribing (avoids React re-renders in hook)
              const store = useBoardStore.getState()

              // Board membership check — card may belong to a different board
              const cardBelongsHere = store.columns.some(
                (col) => col.items.some((c) => c.card_id === updatedCard.card_id),
              )
              if (!cardBelongsHere) return

              // Mutation echo suppressor (B2 fix): if this card was recently moved by
              // this client, skip the positional update entirely — it's just an echo.
              const isEcho = recentlyMovedCards.current.has(updatedCard.card_id)

              if (isEcho) {
                // Still patch non-positional fields in-place (title, description, labels,
                // priority, assignee, due_date, etc.) — but preserve position and sort_order.
                const patchedColumnsInPlace = store.columns.map((col) => ({
                  ...col,
                  items: col.items.map((c) =>
                    c.card_id === updatedCard.card_id
                      ? {
                          ...c,
                          // Patch only non-positional fields; keep current sort_order and state_id
                          title: updatedCard.title,
                          description: updatedCard.description,
                          labels: updatedCard.labels,
                          priority: updatedCard.priority,
                          assigned_agent_id: updatedCard.assigned_agent_id,
                          due_date: updatedCard.due_date,
                          card_type: updatedCard.card_type,
                          parent_card_id: updatedCard.parent_card_id,
                          updated_at: updatedCard.updated_at,
                        }
                      : c,
                  ),
                }))
                store.syncFromServer(patchedColumnsInPlace)
                return
              }

              // External UPDATE (not our echo): find the card's current column
              const currentCol = store.columns.find((col) =>
                col.items.some((c) => c.card_id === updatedCard.card_id),
              )
              const isColumnChange = currentCol?.stateId !== updatedCard.state_id

              if (!isColumnChange) {
                // Same column: patch non-positional fields in-place without touching position.
                // This prevents agents updating metadata from causing position jumps.
                const patchedInPlace = store.columns.map((col) => ({
                  ...col,
                  items: col.items.map((c) =>
                    c.card_id === updatedCard.card_id
                      ? {
                          ...c,
                          title: updatedCard.title,
                          description: updatedCard.description,
                          labels: updatedCard.labels,
                          priority: updatedCard.priority,
                          assigned_agent_id: updatedCard.assigned_agent_id,
                          due_date: updatedCard.due_date,
                          card_type: updatedCard.card_type,
                          parent_card_id: updatedCard.parent_card_id,
                          updated_at: updatedCard.updated_at,
                        }
                      : c,
                  ),
                }))
                store.syncFromServer(patchedInPlace)
              } else {
                // Column change from an external source (agent or other client):
                // allow the full remove+reinsert since this is a legitimate cross-column move.
                const withoutCard = store.columns.map((col) => ({
                  ...col,
                  items: col.items.filter((c) => c.card_id !== updatedCard.card_id),
                }))
                const targetCol = withoutCard.find((col) => col.stateId === updatedCard.state_id)
                if (!targetCol) return

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
                store.syncFromServer(patchedColumns)
              }
            } else {
              // INSERT or DELETE: card count changed — full board reload is the safe fallback
              refetchRef.current()
            }
          }, 80)
        },
      )
      .subscribe()

    return () => {
      // Cleanup — clear debounce timer and remove channel (RT-03: no subscription leaks)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      // Clear all echo suppressor timers
      recentlyMovedCards.current.forEach((timer) => clearTimeout(timer))
      recentlyMovedCards.current.clear()
      supabase.removeChannel(channel)
    }
  }, [boardId])
}
