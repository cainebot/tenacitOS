/**
 * sync-types.ts — shared TypeScript interfaces for the Kanban sync engine.
 *
 * These types are the contract between:
 *   - Server (board_sync_events table, move-card route)
 *   - Local DB (local-db.ts)
 *   - Sync engine (sync-engine.ts)
 *   - Hooks (use-board-sync-engine.ts)
 *   - Board pages (tasks/page.tsx, sales-pipeline/page.tsx)
 */

import type { BoardColumn } from '@/stores/board-store'

// ---------------------------------------------------------------------------
// Server event (received from Supabase Realtime or catch-up fetch)
// ---------------------------------------------------------------------------

export interface SyncEvent {
  /** Monotonic server-assigned ID — defines causal order */
  syncId: number
  boardId: string
  entityType: 'card' | 'column' | 'board'
  entityId: string
  operation: 'insert' | 'update' | 'delete' | 'move' | 'reorder'
  payload: Record<string, unknown>
  /** The client UUID that triggered this mutation (null for server/agent writes) */
  originClientId: string | null
  /** The client-local idempotency key for the mutation that produced this event */
  originMutationId: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Local mutation — in the queue from the moment the user drags a card
// ---------------------------------------------------------------------------

export interface LocalMutation {
  clientMutationId: string
  clientId: string
  boardId: string
  type: 'move-card' | 'reorder-column' | 'patch-card' | 'create-card' | 'delete-card'
  entityId: string
  payload: Record<string, unknown>
  /** queued → sent → acked. Failed means we reverted optimistic UI */
  status: 'queued' | 'sent' | 'acked' | 'failed'
  /** Set when the server HTTP response returns accepted_sync_id */
  acceptedSyncId: number | null
  /** epoch ms when the mutation was created */
  createdAt: number
}

// ---------------------------------------------------------------------------
// Sync state — the full local-first world model
// ---------------------------------------------------------------------------

export interface SyncState {
  boardId: string
  /** The sync_id of the last event we have applied to the snapshot */
  lastAppliedSyncId: number
  /** The confirmed-by-server board state */
  snapshot: BoardColumn[]
  /** Mutations that have not yet been acked by the server event stream */
  pending: LocalMutation[]
}

// ---------------------------------------------------------------------------
// Server move-card response (Phase 73 path — board_id provided)
// ---------------------------------------------------------------------------

export interface MoveCardSyncResponse {
  card: Record<string, unknown>
  accepted_sync_id: number
  client_mutation_id: string | null
}

// ---------------------------------------------------------------------------
// Catch-up result
// ---------------------------------------------------------------------------

export interface CatchUpResult {
  /** Events fetched from the server since lastAppliedSyncId */
  events: SyncEvent[]
  /** New watermark after applying all catch-up events */
  newSyncId: number
}

// ---------------------------------------------------------------------------
// Re-export LocalMutation from local-db for consumers that only need the type
// ---------------------------------------------------------------------------
export type { BoardColumn }
