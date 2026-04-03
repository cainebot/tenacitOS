import { create } from 'zustand'
import type { CardRow } from '@/types/project'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * MoveCardParams — input to the store's moveCard action.
 * The caller (page) pre-computes sortOrder via sortKeyBetween().
 */
export interface MoveCardParams {
  cardId: string
  fromColumnId: string  // column the card is currently in
  toColumnId: string    // column the card is moving to
  stateId: string       // project_state_id for the target column
  sortOrder: string     // pre-computed fractional-indexing key
}

/**
 * BoardColumn — store-specific column type.
 * CardRow has `card_id` (not `id`), so we do NOT use KanbanBoardColumn<CardRow>.
 * This type owns the internal shape the store manages.
 */
export interface BoardColumn {
  columnId: string  // maps to KanbanBoardColumn.id
  title: string     // column display name
  stateId: string   // the project_state_id this column represents
  items: CardRow[]  // raw DB rows, sorted by sort_order ascending
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

// Callback type registered by useStoreSyncRealtime to suppress realtime echoes
type EchoSuppressor = (cardId: string) => void

interface BoardState {
  boardId: string | null
  columns: BoardColumn[]
  pendingMutations: number

  // Actions
  loadBoard: (boardId: string, columns: BoardColumn[]) => void
  moveCard: (params: MoveCardParams) => Promise<void>
  syncFromServer: (columns: BoardColumn[]) => void
  /**
   * setSyncColumns — bypass the pending-guard and set columns directly.
   * Used by the sync engine which handles its own pending tracking.
   * Phase 73: called by useBoardSyncEngine when the engine emits new columns.
   */
  setSyncColumns: (columns: BoardColumn[]) => void
  renameColumn: (columnId: string, title: string) => void
  reset: () => void
  /** Called by useStoreSyncRealtime to register a per-card echo suppressor (B2 fix) */
  registerEchoSuppressor: (fn: EchoSuppressor) => void
  /** Patch non-positional fields on a card in the store. No API call — instant UI update. */
  patchCardInStore: (cardId: string, patch: Partial<Pick<CardRow, 'title' | 'description' | 'labels' | 'priority' | 'assigned_agent_id' | 'due_date' | 'card_type'>>) => void
}

// ---------------------------------------------------------------------------
// Pure helper: applyOptimisticMove
// ---------------------------------------------------------------------------

function applyOptimisticMove(
  columns: BoardColumn[],
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  sortOrder: string,
): BoardColumn[] {
  let movedCard: CardRow | undefined

  // Remove card from its source column (primary path: match fromColumnId)
  const result = columns.map((col) => {
    if (col.columnId === fromColumnId || !fromColumnId) {
      const idx = col.items.findIndex((c) => c.card_id === cardId)
      if (idx !== -1) {
        movedCard = { ...col.items[idx], sort_order: sortOrder, state_id: col.stateId }
        return { ...col, items: col.items.filter((_, i) => i !== idx) }
      }
    }
    return col
  })

  // Safety fallback: card not found in fromColumn — search all columns
  if (!movedCard) {
    for (const col of columns) {
      const card = col.items.find((c) => c.card_id === cardId)
      if (card) {
        movedCard = { ...card, sort_order: sortOrder }
        break
      }
    }
    if (!movedCard) return columns // card not found at all, return unchanged

    // Remove from wherever it was
    const withoutCard = columns.map((col) => ({
      ...col,
      items: col.items.filter((c) => c.card_id !== cardId),
    }))

    // Insert into target column
    const targetCol = withoutCard.find((c) => c.columnId === toColumnId)
    if (!targetCol) return columns

    const finalCard = { ...movedCard, sort_order: sortOrder }
    return withoutCard.map((col) =>
      col.columnId === toColumnId
        ? {
            ...col,
            items: [...col.items, finalCard].sort((a, b) =>
              a.sort_order < b.sort_order ? -1 : a.sort_order > b.sort_order ? 1 : 0,
            ),
          }
        : col,
    )
  }

  // Update moved card's state_id to match target column
  const targetCol = result.find((c) => c.columnId === toColumnId)
  if (targetCol) {
    movedCard = { ...movedCard, state_id: targetCol.stateId }
  }

  // Insert into target column, sorted by sort_order
  return result.map((col) =>
    col.columnId === toColumnId
      ? {
          ...col,
          items: [...col.items, movedCard!].sort((a, b) =>
            a.sort_order < b.sort_order ? -1 : a.sort_order > b.sort_order ? 1 : 0,
          ),
        }
      : col,
  )
}

// ---------------------------------------------------------------------------
// Pure helper: revertCardToSnapshot
// ---------------------------------------------------------------------------

function revertCardToSnapshot(
  current: BoardColumn[],
  snapshot: BoardColumn[],
  cardId: string,
): BoardColumn[] {
  // Find the card's position in the snapshot
  let snapshotCard: CardRow | undefined
  let snapshotColumnId: string | undefined
  for (const col of snapshot) {
    const card = col.items.find((c) => c.card_id === cardId)
    if (card) {
      snapshotCard = card
      snapshotColumnId = col.columnId
      break
    }
  }
  if (!snapshotCard || !snapshotColumnId) return current

  // Remove the card from wherever it currently is in `current`
  const without = current.map((col) => ({
    ...col,
    items: col.items.filter((c) => c.card_id !== cardId),
  }))

  // Put it back in the snapshot column at its original sort_order
  return without.map((col) =>
    col.columnId === snapshotColumnId
      ? {
          ...col,
          items: [...col.items, snapshotCard!].sort((a, b) =>
            a.sort_order < b.sort_order ? -1 : a.sort_order > b.sort_order ? 1 : 0,
          ),
        }
      : col,
  )
}

// ---------------------------------------------------------------------------
// Store — global singleton (no Provider needed)
// ---------------------------------------------------------------------------

// Module-level echo suppressor ref — set by useStoreSyncRealtime, called in moveCard
let _echoSuppressor: EchoSuppressor | null = null

export const useBoardStore = create<BoardState>()((set, get) => ({
  boardId: null,
  columns: [],
  pendingMutations: 0,

  loadBoard: (boardId, columns) => {
    // KSTORE-04: reset pendingMutations to 0 to prevent stale counter from previous board
    set({ boardId, columns, pendingMutations: 0 })
  },

  renameColumn: (columnId, title) => {
    set((state) => ({
      columns: state.columns.map((col) =>
        col.columnId === columnId ? { ...col, title } : col,
      ),
    }))
  },

  reset: () => {
    set({ boardId: null, columns: [], pendingMutations: 0 })
  },

  syncFromServer: (columns) => {
    // KSTORE-04: no-op when mutations are in flight — prevents stale server state
    if (get().pendingMutations > 0) return
    set({ columns })
  },

  setSyncColumns: (columns) => {
    // Phase 73: called by useBoardSyncEngine — bypass pending guard because
    // the sync engine already has the correct rebased columns incorporating
    // all pending mutations.
    set({ columns })
  },

  registerEchoSuppressor: (fn) => {
    _echoSuppressor = fn
  },

  patchCardInStore: (cardId, patch) => {
    set((state) => ({
      columns: state.columns.map((col) => ({
        ...col,
        items: col.items.map((c) =>
          c.card_id === cardId ? { ...c, ...patch } : c,
        ),
      })),
    }))
  },

  moveCard: async (params) => {
    const { cardId, fromColumnId, toColumnId, stateId, sortOrder } = params

    // B2 fix: register this card as "recently moved by us" so realtime echoes are suppressed
    _echoSuppressor?.(cardId)

    // KSTORE-05: Snapshot BEFORE any mutation (enables per-card revert)
    const snapshot = get().columns

    const isSameColumn = fromColumnId === toColumnId

    if (isSameColumn) {
      // B4 fix: for same-column reorders, update sort_order in-place without changing
      // the card's array position. The visual position is already correct from KanbanBoard.
      // applyOptimisticMove's sort-by-key would produce a different index than the visual drop.
      set((state) => ({
        pendingMutations: state.pendingMutations + 1,
        columns: state.columns.map((col) =>
          col.columnId === fromColumnId
            ? {
                ...col,
                items: col.items.map((c) =>
                  c.card_id === cardId ? { ...c, sort_order: sortOrder } : c,
                ),
              }
            : col,
        ),
      }))
    } else {
      // KSTORE-02 + KSTORE-03: Apply optimistic update synchronously + increment counter
      set((state) => ({
        pendingMutations: state.pendingMutations + 1,
        columns: applyOptimisticMove(state.columns, cardId, fromColumnId, toColumnId, sortOrder),
      }))
    }

    // Fire API call to /api/cards/[cardId]/move
    try {
      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state_id: stateId,
          moved_by: 'human',
          sort_order: sortOrder,
        }),
      })

      if (!res.ok) {
        throw new Error(`Move failed: ${res.status}`)
      }

      // Success: decrement counter using Math.max to guard against underflow
      set((state) => ({
        pendingMutations: Math.max(0, state.pendingMutations - 1),
      }))
    } catch {
      // KSTORE-05: Revert ONLY the affected card — not the entire board
      set((state) => ({
        columns: revertCardToSnapshot(state.columns, snapshot, cardId),
        pendingMutations: Math.max(0, state.pendingMutations - 1),
      }))
    }
  },
}))
