'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import type { KanbanBoardColumn } from '@/components/application/kanban-board'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingMutation {
  cardId: string
  fromColumnId: string
  toColumnId: string
  sortOrder: string
  timestamp: number
  timerId: ReturnType<typeof setTimeout>
}

interface UseOptimisticColumnsReturn<T extends { id: string }> {
  effectiveColumns: KanbanBoardColumn<T>[]
  applyOptimisticMove: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    sortOrder: string,
  ) => void
  revertOptimisticMove: (cardId: string) => void
  getEffectiveSortOrder: (cardId: string, fallback: string) => string
  pendingMutations: Map<string, PendingMutation>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const SAFETY_TIMEOUT_MS = 8000

export function useOptimisticColumns<T extends { id: string }>(
  liveColumns: KanbanBoardColumn<T>[],
  getSortOrder: (item: T) => string,
): UseOptimisticColumnsReturn<T> {
  const pendingRef = useRef<Map<string, PendingMutation>>(new Map())
  const optimisticSortOrdersRef = useRef<Map<string, string>>(new Map())
  const [version, setVersion] = useState(0)

  // --------------------------------------------------
  // applyOptimisticMove — records a pending mutation with its sort_order
  // --------------------------------------------------
  const applyOptimisticMove = useCallback((
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    sortOrder: string,
  ) => {
    const existing = pendingRef.current.get(cardId)
    if (existing) clearTimeout(existing.timerId)

    const timerId = setTimeout(() => {
      if (pendingRef.current.has(cardId)) {
        pendingRef.current.delete(cardId)
        optimisticSortOrdersRef.current.delete(cardId)
        setVersion((v) => v + 1)
      }
    }, SAFETY_TIMEOUT_MS)

    pendingRef.current.set(cardId, {
      cardId,
      fromColumnId,
      toColumnId,
      sortOrder,
      timestamp: Date.now(),
      timerId,
    })

    optimisticSortOrdersRef.current.set(cardId, sortOrder)
    setVersion((v) => v + 1)
  }, [])

  // --------------------------------------------------
  // revertOptimisticMove — immediately removes optimistic state on error
  // --------------------------------------------------
  const revertOptimisticMove = useCallback((cardId: string) => {
    const mutation = pendingRef.current.get(cardId)
    if (mutation) clearTimeout(mutation.timerId)
    pendingRef.current.delete(cardId)
    optimisticSortOrdersRef.current.delete(cardId)
    setVersion((v) => v + 1)
  }, [])

  // --------------------------------------------------
  // getEffectiveSortOrder — returns optimistic sort_order or fallback
  // Used by the page to calculate correct neighbor values for rapid reorders
  // --------------------------------------------------
  const getEffectiveSortOrder = useCallback((cardId: string, fallback: string): string => {
    return optimisticSortOrdersRef.current.get(cardId) ?? fallback
  }, [])

  // --------------------------------------------------
  // effectiveColumns — merges pending mutations over liveColumns using sort_order
  // --------------------------------------------------
  const effectiveColumns = useMemo((): KanbanBoardColumn<T>[] => {
    const pending = pendingRef.current
    const sortOverrides = optimisticSortOrdersRef.current

    // Fast path: no pending mutations
    if (pending.size === 0) {
      return liveColumns
    }

    // Confirm mutations whose sort_order now matches the live data
    const confirmedKeys: string[] = []
    for (const [key, mutation] of pending) {
      const targetCol = liveColumns.find((c) => c.id === mutation.toColumnId)
      if (!targetCol) continue

      const liveCard = targetCol.items.find((item) => item.id === mutation.cardId)

      if (mutation.fromColumnId === mutation.toColumnId) {
        // Same-column reorder: confirm when live sort_order matches optimistic
        if (liveCard && getSortOrder(liveCard) === mutation.sortOrder) {
          confirmedKeys.push(key)
        }
      } else {
        // Cross-column move: confirm when card exists in target column AND sort_order matches
        if (liveCard && getSortOrder(liveCard) === mutation.sortOrder) {
          confirmedKeys.push(key)
        }
      }
    }

    for (const key of confirmedKeys) {
      const m = pending.get(key)
      if (m) clearTimeout(m.timerId)
      pending.delete(key)
      sortOverrides.delete(key)
    }

    // After confirmations, if nothing remains, return liveColumns directly
    if (pending.size === 0) {
      return liveColumns
    }

    // Merge: start from liveColumns, move cards according to pending mutations
    const merged = liveColumns.map((col) => ({
      ...col,
      items: [...col.items],
    }))

    for (const [, mutation] of pending) {
      if (mutation.fromColumnId === mutation.toColumnId) continue

      // Cross-column move: find and relocate the card
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
        sortOverrides.delete(mutation.cardId)
        continue
      }

      // Insert into the target column (position determined by sort below)
      const targetCol = merged.find((c) => c.id === mutation.toColumnId)
      if (targetCol) {
        targetCol.items.push(card)
      }
    }

    // Sort each column by sort_order, applying optimistic overrides
    for (const col of merged) {
      col.items.sort((a, b) => {
        const aSort = sortOverrides.get(a.id) ?? getSortOrder(a)
        const bSort = sortOverrides.get(b.id) ?? getSortOrder(b)
        if (aSort < bSort) return -1
        if (aSort > bSort) return 1
        return 0
      })
    }

    return merged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveColumns, version, getSortOrder])

  // --------------------------------------------------
  // Cleanup: clear all safety timers on unmount
  // --------------------------------------------------
  useEffect(() => {
    return () => {
      for (const [, mutation] of pendingRef.current) {
        clearTimeout(mutation.timerId)
      }
      pendingRef.current.clear()
      optimisticSortOrdersRef.current.clear()
    }
  }, [])

  return {
    effectiveColumns,
    applyOptimisticMove,
    revertOptimisticMove,
    getEffectiveSortOrder,
    pendingMutations: pendingRef.current,
  }
}
