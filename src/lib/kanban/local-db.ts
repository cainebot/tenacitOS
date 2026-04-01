/**
 * local-db.ts — IndexedDB-backed persistence for the Kanban sync engine.
 *
 * Stores three things per board:
 *   1. sync_state      — last applied sync_id + board snapshot
 *   2. pending_mutations — local mutations waiting for server ack
 *   3. client_id         — a stable UUID per browser tab/user
 *
 * The sync engine reads from here on boot to render the board instantly
 * and resume from the correct server watermark after refresh.
 *
 * Uses `idb` (a tiny typed IndexedDB wrapper) — no Dexie needed.
 */

import { openDB, type IDBPDatabase } from 'idb'
import type { BoardColumn } from '@/stores/board-store'

// ---------------------------------------------------------------------------
// DB schema types
// ---------------------------------------------------------------------------

export interface LocalMutation {
  clientMutationId: string
  clientId: string
  boardId: string
  type: 'move-card' | 'reorder-column' | 'patch-card' | 'create-card' | 'delete-card'
  entityId: string
  payload: Record<string, unknown>
  status: 'queued' | 'sent' | 'acked' | 'failed'
  acceptedSyncId: number | null
  createdAt: number
}

export interface SyncState {
  boardId: string
  lastAppliedSyncId: number
  snapshot: BoardColumn[]
  snapshotAt: number // unix ms
}

interface KanbanDB {
  sync_state: {
    key: string // boardId
    value: SyncState
  }
  pending_mutations: {
    key: string // clientMutationId
    value: LocalMutation
    indexes: { boardId: string }
  }
}

// ---------------------------------------------------------------------------
// DB singleton
// ---------------------------------------------------------------------------

const DB_NAME = 'circos-kanban-sync'
const DB_VERSION = 1

let _db: IDBPDatabase<KanbanDB> | null = null

async function getDB(): Promise<IDBPDatabase<KanbanDB>> {
  if (_db) return _db

  // openDB is safe to call concurrently — the browser serializes upgrades
  _db = await openDB<KanbanDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // sync_state: keyed by boardId
      if (!db.objectStoreNames.contains('sync_state')) {
        db.createObjectStore('sync_state', { keyPath: 'boardId' })
      }

      // pending_mutations: keyed by clientMutationId, indexed by boardId
      if (!db.objectStoreNames.contains('pending_mutations')) {
        const store = db.createObjectStore('pending_mutations', {
          keyPath: 'clientMutationId',
        })
        store.createIndex('boardId', 'boardId', { unique: false })
      }
    },
  })

  return _db
}

// ---------------------------------------------------------------------------
// client_id — stable UUID persisted in localStorage
// ---------------------------------------------------------------------------

const CLIENT_ID_KEY = 'circos-kanban-client-id'

export function getClientId(): string {
  if (typeof window === 'undefined') return 'server'

  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

// ---------------------------------------------------------------------------
// sync_state CRUD
// ---------------------------------------------------------------------------

export async function loadSyncState(boardId: string): Promise<SyncState | null> {
  try {
    const db = await getDB()
    return (await db.get('sync_state', boardId)) ?? null
  } catch {
    // IndexedDB unavailable (private mode, etc.) — degrade gracefully
    return null
  }
}

export async function saveSyncState(state: SyncState): Promise<void> {
  try {
    const db = await getDB()
    await db.put('sync_state', state)
  } catch {
    // Silently degrade — sync still works, just without persistence
  }
}

export async function clearSyncState(boardId: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('sync_state', boardId)
  } catch {}
}

// ---------------------------------------------------------------------------
// pending_mutations CRUD
// ---------------------------------------------------------------------------

export async function loadPendingMutations(boardId: string): Promise<LocalMutation[]> {
  try {
    const db = await getDB()
    return await db.getAllFromIndex('pending_mutations', 'boardId', boardId)
  } catch {
    return []
  }
}

export async function saveMutation(mutation: LocalMutation): Promise<void> {
  try {
    const db = await getDB()
    await db.put('pending_mutations', mutation)
  } catch {}
}

export async function updateMutationStatus(
  clientMutationId: string,
  status: LocalMutation['status'],
  acceptedSyncId?: number,
): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction('pending_mutations', 'readwrite')
    const existing = await tx.store.get(clientMutationId)
    if (existing) {
      existing.status = status
      if (acceptedSyncId !== undefined) {
        existing.acceptedSyncId = acceptedSyncId
      }
      await tx.store.put(existing)
    }
    await tx.done
  } catch {}
}

export async function deleteMutation(clientMutationId: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('pending_mutations', clientMutationId)
  } catch {}
}

export async function clearAckedMutations(boardId: string): Promise<void> {
  try {
    const db = await getDB()
    const all = await db.getAllFromIndex('pending_mutations', 'boardId', boardId)
    const tx = db.transaction('pending_mutations', 'readwrite')
    for (const m of all) {
      if (m.status === 'acked') {
        await tx.store.delete(m.clientMutationId)
      }
    }
    await tx.done
  } catch {}
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

/**
 * saveSnapshot — persist the current board column array as the latest
 * confirmed-by-server board state along with the sync watermark.
 */
export async function saveSnapshot(
  boardId: string,
  snapshot: BoardColumn[],
  lastAppliedSyncId: number,
): Promise<void> {
  await saveSyncState({
    boardId,
    lastAppliedSyncId,
    snapshot,
    snapshotAt: Date.now(),
  })
}

/**
 * loadSnapshot — return the last persisted board snapshot for fast initial render.
 * Returns null if no snapshot exists (first load or cleared state).
 */
export async function loadSnapshot(
  boardId: string,
): Promise<{ snapshot: BoardColumn[]; lastAppliedSyncId: number } | null> {
  const state = await loadSyncState(boardId)
  if (!state) return null
  return {
    snapshot: state.snapshot,
    lastAppliedSyncId: state.lastAppliedSyncId,
  }
}

// ---------------------------------------------------------------------------
// Debug / instrumentation helpers
// ---------------------------------------------------------------------------

/**
 * debugDump — returns a full dump of local sync state for a board.
 * Used in dev-mode instrumentation and test assertions.
 *
 * Checks:
 *   - lastAppliedSyncId
 *   - pending mutation count and IDs
 *   - snapshot freshness (snapshotAt)
 */
export async function debugDump(boardId: string): Promise<{
  lastAppliedSyncId: number
  snapshotAt: number | null
  pendingCount: number
  pendingMutationIds: string[]
  pendingStatuses: Record<string, LocalMutation['status']>
}> {
  const state = await loadSyncState(boardId)
  const pending = await loadPendingMutations(boardId)
  return {
    lastAppliedSyncId: state?.lastAppliedSyncId ?? 0,
    snapshotAt: state?.snapshotAt ?? null,
    pendingCount: pending.length,
    pendingMutationIds: pending.map(m => m.clientMutationId),
    pendingStatuses: Object.fromEntries(
      pending.map(m => [m.clientMutationId, m.status]),
    ),
  }
}
