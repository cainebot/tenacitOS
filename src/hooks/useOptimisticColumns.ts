'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import type { KanbanBoardColumn } from '@/components/application/kanban-board'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingMutation {
  cardId: string
  toColumnId: string
  timestamp: number
  timerId: ReturnType<typeof setTimeout>
}

interface UseOptimisticColumnsReturn<T extends { id: string }> {
  effectiveColumns: KanbanBoardColumn<T>[]
  applyOptimisticMove: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    newColumns: KanbanBoardColumn<T>[],
  ) => void
  pendingMutations: Map<string, PendingMutation>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOptimisticColumns<T extends { id: string }>(
  liveColumns: KanbanBoardColumn<T>[],
): UseOptimisticColumnsReturn<T> {
  // Pending mutations stored in a ref to avoid Map identity issues with state.
  // A version counter is the sole trigger for useMemo recalculation.
  const pendingRef = useRef<Map<string, PendingMutation>>(new Map())
  const [version, setVersion] = useState(0)

  // Snapshot of columns immediately after the last drag (used for the first
  // render after a move so the exact DnD-produced layout is shown).
  const optimisticSnapshotRef = useRef<KanbanBoardColumn<T>[] | null>(null)

  // --------------------------------------------------
  // applyOptimisticMove
  // --------------------------------------------------
  const applyOptimisticMove = (
    cardId: string,
    _fromColumnId: string,
    toColumnId: string,
    newColumns: KanbanBoardColumn<T>[],
  ) => {
    // Clear any existing safety timer for this card (re-drag scenario)
    const existing = pendingRef.current.get(cardId)
    if (existing) clearTimeout(existing.timerId)

    // Safety timeout: if the mutation is still pending after 5s, drop it
    const timerId = setTimeout(() => {
      if (pendingRef.current.has(cardId)) {
        pendingRef.current.delete(cardId)
        optimisticSnapshotRef.current = null
        setVersion((v) => v + 1)
      }
    }, 5000)

    pendingRef.current.set(cardId, {
      cardId,
      toColumnId,
      timestamp: Date.now(),
      timerId,
    })

    optimisticSnapshotRef.current = newColumns
    setVersion((v) => v + 1)
  }

  // --------------------------------------------------
  // effectiveColumns — merges pending mutations over liveColumns
  // --------------------------------------------------
  const effectiveColumns = useMemo((): KanbanBoardColumn<T>[] => {
    const pending = pendingRef.current

    // Fast path: no pending mutations
    if (pending.size === 0) {
      return liveColumns
    }

    // Check each pending mutation: if liveColumns already has the card in the
    // expected column, that mutation is confirmed — remove it.
    const confirmedKeys: string[] = []
    for (const [key, mutation] of pending) {
      const targetCol = liveColumns.find((c) => c.id === mutation.toColumnId)
      if (targetCol && targetCol.items.some((item) => item.id === mutation.cardId)) {
        confirmedKeys.push(key)
      }
    }

    for (const key of confirmedKeys) {
      const m = pending.get(key)
      if (m) clearTimeout(m.timerId)
      pending.delete(key)
    }

    // After confirmations, if nothing remains, return liveColumns directly
    if (pending.size === 0) {
      optimisticSnapshotRef.current = null
      return liveColumns
    }

    // If we still have an optimistic snapshot from the most recent drag,
    // use it as the immediate rendered layout. This prevents any visual
    // difference between the DnD drop position and what React renders.
    if (optimisticSnapshotRef.current) {
      return optimisticSnapshotRef.current
    }

    // Merge: start from liveColumns, move cards according to pending mutations
    const merged = liveColumns.map((col) => ({
      ...col,
      items: [...col.items],
    }))

    for (const [, mutation] of pending) {
      // Find and remove the card from wherever it currently sits
      let card: T | undefined
      for (const col of merged) {
        const idx = col.items.findIndex((i) => i.id === mutation.cardId)
        if (idx !== -1) {
          card = col.items.splice(idx, 1)[0]
          break
        }
      }

      if (!card) {
        // Card was deleted or not found — drop the mutation
        const m = pending.get(mutation.cardId)
        if (m) clearTimeout(m.timerId)
        pending.delete(mutation.cardId)
        continue
      }

      // Insert into the target column
      const targetCol = merged.find((c) => c.id === mutation.toColumnId)
      if (targetCol) {
        targetCol.items.push(card)
      }
    }

    return merged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveColumns, version])

  // --------------------------------------------------
  // Cleanup: clear all safety timers on unmount
  // --------------------------------------------------
  useEffect(() => {
    return () => {
      for (const [, mutation] of pendingRef.current) {
        clearTimeout(mutation.timerId)
      }
      pendingRef.current.clear()
    }
  }, [])

  return {
    effectiveColumns,
    applyOptimisticMove,
    pendingMutations: pendingRef.current,
  }
}
