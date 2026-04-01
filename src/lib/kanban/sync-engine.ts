/**
 * sync-engine.ts — Client-side mutation queue, ack tracking, rebase logic,
 * and catch-up protocol for the Linear-style Kanban sync architecture.
 *
 * This is a PURE TypeScript module — no React imports, no hooks.
 * Hooks (use-board-sync-engine.ts) adapt it to the React lifecycle.
 *
 * Architecture:
 *   1. Caller calls enqueueMutation() → applies optimistic UI, sends HTTP, marks sent
 *   2. Server returns accepted_sync_id → updateMutationAccepted()
 *   3. Realtime event arrives → applyServerEvent()
 *      - If event matches a pending mutation (same origin_client_id + origin_mutation_id)
 *        → ack the mutation (remove from pending queue)
 *      - Rebase any still-pending mutations over the new snapshot
 *   4. Refresh/reconnect → catchUpFromServer() using lastAppliedSyncId
 */

import type { BoardColumn } from '@/stores/board-store'
import type { CardRow } from '@/types/project'
import type { SyncEvent, LocalMutation, SyncState } from './sync-types'
import {
  getClientId,
  loadSnapshot,
  saveSnapshot,
  loadPendingMutations,
  saveMutation,
  updateMutationStatus,
  deleteMutation,
  clearAckedMutations,
} from './local-db'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * applyMoveToSnapshot — apply a move-card mutation to a board column array.
 * Pure function, returns new columns.
 */
function applyMoveToSnapshot(
  columns: BoardColumn[],
  cardId: string,
  toStateId: string,
  sortOrder: string,
): BoardColumn[] {
  let movedCard: CardRow | undefined
  const stateToColumnId = new Map<string, string>()
  columns.forEach(col => stateToColumnId.set(col.stateId, col.columnId))

  // Remove from source
  const without = columns.map(col => {
    const idx = col.items.findIndex(c => c.card_id === cardId)
    if (idx !== -1) {
      movedCard = { ...col.items[idx], state_id: toStateId, sort_order: sortOrder }
      return { ...col, items: col.items.filter((_, i) => i !== idx) }
    }
    return col
  })

  if (!movedCard) return columns

  const toColumnId = stateToColumnId.get(toStateId)
  if (!toColumnId) return columns

  return without.map(col =>
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

/**
 * rebaseOverSnapshot — replay all pending mutations over a new server snapshot.
 * Returns the rebased board columns (what gets rendered in the UI).
 */
function rebaseOverSnapshot(
  snapshot: BoardColumn[],
  pending: LocalMutation[],
): BoardColumn[] {
  let result = snapshot
  for (const m of pending) {
    if (m.status === 'acked' || m.status === 'failed') continue
    if (m.type === 'move-card') {
      const { state_id, sort_order } = m.payload as { state_id: string; sort_order: string }
      result = applyMoveToSnapshot(result, m.entityId, state_id, sort_order)
    }
    // Additional mutation types (patch-card, etc.) can be added here
  }
  return result
}

// ---------------------------------------------------------------------------
// SyncEngine class
// ---------------------------------------------------------------------------

export interface SyncEngineOptions {
  boardId: string
  /** Called whenever rendered columns change (snapshot + rebased pending) */
  onColumnsChange: (columns: BoardColumn[]) => void
  /** Called when a catch-up or reconnect is needed */
  onCatchUpNeeded: (afterSyncId: number) => void
}

export class SyncEngine {
  private boardId: string
  private clientId: string
  private snapshot: BoardColumn[] = []
  private pending: LocalMutation[] = []
  private lastAppliedSyncId = 0
  private onColumnsChange: (cols: BoardColumn[]) => void
  private onCatchUpNeeded: (afterSyncId: number) => void
  private initialized = false

  constructor(options: SyncEngineOptions) {
    this.boardId = options.boardId
    this.clientId = getClientId()
    this.onColumnsChange = options.onColumnsChange
    this.onCatchUpNeeded = options.onCatchUpNeeded
  }

  // ---- Initialization ------------------------------------------------------

  /**
   * boot — load persisted snapshot and pending mutations from IndexedDB.
   * Returns the persisted columns for immediate rendering (before server catch-up).
   */
  async boot(): Promise<BoardColumn[] | null> {
    const persisted = await loadSnapshot(this.boardId)
    if (persisted) {
      this.snapshot = persisted.snapshot
      this.lastAppliedSyncId = persisted.lastAppliedSyncId
    }

    this.pending = await loadPendingMutations(this.boardId)
    // Reset any 'sent' mutations back to 'queued' on reload — they may not have
    // been acknowledged before the page refreshed.
    for (const m of this.pending) {
      if (m.status === 'sent') {
        m.status = 'queued'
        await saveMutation(m)
      }
    }

    this.initialized = true

    if (!persisted) return null

    // Emit rebased columns immediately so the page can render
    const rebased = rebaseOverSnapshot(this.snapshot, this.pending)
    return rebased
  }

  /**
   * seedFromServer — called when server provides the initial full board state
   * (e.g. after useBoardData() loads the board). Sets the snapshot if we have
   * no persisted state yet, or if the server state is newer.
   */
  seedFromServer(columns: BoardColumn[], serverSyncId = 0): void {
    // Only seed snapshot if we have no local snapshot or the server is clearly ahead
    if (this.snapshot.length === 0 || serverSyncId >= this.lastAppliedSyncId) {
      this.snapshot = columns
      this.lastAppliedSyncId = serverSyncId
      void saveSnapshot(this.boardId, columns, serverSyncId)
    }
    this.emitColumns()
  }

  // ---- Mutation queue ------------------------------------------------------

  /**
   * enqueueMutation — call when the user triggers a local move.
   * Applies optimistic UI immediately and persists the mutation.
   */
  async enqueueMutation(
    mutation: Omit<LocalMutation, 'clientMutationId' | 'clientId' | 'status' | 'acceptedSyncId' | 'createdAt'>,
  ): Promise<LocalMutation> {
    const m: LocalMutation = {
      ...mutation,
      clientMutationId: crypto.randomUUID(),
      clientId: this.clientId,
      status: 'queued',
      acceptedSyncId: null,
      createdAt: Date.now(),
    }

    // Apply to in-memory snapshot optimistically
    if (m.type === 'move-card') {
      const { state_id, sort_order } = m.payload as { state_id: string; sort_order: string }
      this.snapshot = applyMoveToSnapshot(this.snapshot, m.entityId, state_id, sort_order)
    }

    this.pending.push(m)
    await saveMutation(m)
    this.emitColumns()
    return m
  }

  /**
   * markSent — called when the HTTP request is in-flight.
   */
  async markSent(clientMutationId: string): Promise<void> {
    const m = this.pending.find(x => x.clientMutationId === clientMutationId)
    if (m) {
      m.status = 'sent'
      await saveMutation(m)
    }
  }

  /**
   * updateMutationAccepted — called when HTTP response returns accepted_sync_id.
   * The mutation is still pending until the matching server event arrives.
   */
  async updateMutationAccepted(
    clientMutationId: string,
    acceptedSyncId: number,
  ): Promise<void> {
    const m = this.pending.find(x => x.clientMutationId === clientMutationId)
    if (m) {
      m.acceptedSyncId = acceptedSyncId
      await updateMutationStatus(clientMutationId, m.status, acceptedSyncId)
    }
  }

  /**
   * failMutation — HTTP error before acceptance. Revert optimistic UI.
   */
  async failMutation(clientMutationId: string): Promise<void> {
    const m = this.pending.find(x => x.clientMutationId === clientMutationId)
    if (!m) return
    m.status = 'failed'
    await updateMutationStatus(clientMutationId, 'failed')
    // Remove from pending and recalculate from snapshot
    this.pending = this.pending.filter(x => x.clientMutationId !== clientMutationId)
    await deleteMutation(clientMutationId)
    this.emitColumns()
  }

  // ---- Server event application --------------------------------------------

  /**
   * applyServerEvent — process one event from the sync stream.
   *
   * Steps:
   *   1. Check if event is in order. If gap detected → request catch-up.
   *   2. Apply event to base snapshot.
   *   3. Ack local mutation if origin matches.
   *   4. Rebase remaining pending mutations.
   *   5. Persist snapshot + watermark.
   */
  async applyServerEvent(event: SyncEvent): Promise<void> {
    // Gap detection: if we're missing events, trigger catch-up before applying
    if (this.initialized && event.syncId > this.lastAppliedSyncId + 1) {
      // There's a gap — request catch-up from current watermark
      this.onCatchUpNeeded(this.lastAppliedSyncId)
      // Still apply the event to prevent infinite loop on reconnect
    }

    // Apply the event to the base snapshot (not the rebased view)
    if (event.entityType === 'card' && event.operation === 'move') {
      const { state_id, sort_order } = event.payload as { state_id: string; sort_order: string }
      this.snapshot = applyMoveToSnapshot(
        this.snapshot,
        event.entityId,
        state_id,
        sort_order,
      )
    }

    // Update watermark
    this.lastAppliedSyncId = Math.max(this.lastAppliedSyncId, event.syncId)

    // Ack local mutation if this event corresponds to one of ours
    if (event.originClientId === this.clientId && event.originMutationId) {
      const m = this.pending.find(
        x => x.clientMutationId === event.originMutationId,
      )
      if (m) {
        m.status = 'acked'
        m.acceptedSyncId = event.syncId
        await deleteMutation(m.clientMutationId)
        this.pending = this.pending.filter(
          x => x.clientMutationId !== m.clientMutationId,
        )
      }
    }

    // Clean up any old acked mutations (defensive)
    await clearAckedMutations(this.boardId)

    // Persist updated snapshot + watermark
    await saveSnapshot(this.boardId, this.snapshot, this.lastAppliedSyncId)

    // Emit rebased columns to React
    this.emitColumns()
  }

  /**
   * applyEventBatch — apply a slice of catch-up events in order.
   * Used after reconnect or page refresh.
   */
  async applyEventBatch(events: SyncEvent[]): Promise<void> {
    // Sort ascending by syncId to ensure correct application order
    const sorted = [...events].sort((a, b) => a.syncId - b.syncId)
    for (const event of sorted) {
      await this.applyServerEvent(event)
    }
  }

  // ---- State accessors (for hooks) -----------------------------------------

  get currentClientId(): string {
    return this.clientId
  }

  get currentLastAppliedSyncId(): number {
    return this.lastAppliedSyncId
  }

  get pendingCount(): number {
    return this.pending.filter(m => m.status !== 'acked' && m.status !== 'failed').length
  }

  get pendingMutations(): LocalMutation[] {
    return this.pending
  }

  getRenderedColumns(): BoardColumn[] {
    return rebaseOverSnapshot(this.snapshot, this.pending)
  }

  // ---- Reset ---------------------------------------------------------------

  /**
   * reset — clear local state. Called when switching boards.
   */
  reset(): void {
    this.snapshot = []
    this.pending = []
    this.lastAppliedSyncId = 0
    this.initialized = false
  }

  // ---- Debug / instrumentation ---------------------------------------------

  /**
   * debugState — returns a snapshot of the engine's internal state for
   * dev-mode inspection panels and test assertions.
   *
   * Contains:
   *   - clientId
   *   - lastAppliedSyncId
   *   - pendingCount (non-acked, non-failed)
   *   - pendingMutations (full array for deep inspection)
   *   - snapshotColumnCount
   *   - initialized
   */
  debugState(): {
    clientId: string
    lastAppliedSyncId: number
    pendingCount: number
    pendingMutations: LocalMutation[]
    snapshotColumnCount: number
    initialized: boolean
  } {
    return {
      clientId: this.clientId,
      lastAppliedSyncId: this.lastAppliedSyncId,
      pendingCount: this.pendingCount,
      pendingMutations: [...this.pending],
      snapshotColumnCount: this.snapshot.length,
      initialized: this.initialized,
    }
  }

  // ---- Private helpers -----------------------------------------------------

  private emitColumns(): void {
    const cols = rebaseOverSnapshot(this.snapshot, this.pending)
    this.onColumnsChange(cols)
  }
}
