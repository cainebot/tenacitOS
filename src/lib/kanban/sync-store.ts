/**
 * sync-store.ts — Zustand slice for observable sync engine state.
 *
 * Exposes:
 *   - clientId           — stable UUID for this browser
 *   - lastAppliedSyncId  — server watermark
 *   - pendingCount       — number of mutations waiting for ack
 *   - syncEngineActive   — whether the sync engine is driving the board
 *
 * Kept separate from board-store.ts to avoid coupling the sync
 * infrastructure to the core board state.
 */

import { create } from 'zustand'

interface SyncStoreState {
  clientId: string
  lastAppliedSyncId: number
  pendingCount: number
  syncEngineActive: boolean

  // Actions
  setClientId: (id: string) => void
  setSyncId: (id: number) => void
  setPendingCount: (count: number) => void
  setSyncEngineActive: (active: boolean) => void
  reset: () => void
}

export const useSyncStore = create<SyncStoreState>()((set) => ({
  clientId: '',
  lastAppliedSyncId: 0,
  pendingCount: 0,
  syncEngineActive: false,

  setClientId: (id) => set({ clientId: id }),
  setSyncId: (id) => set({ lastAppliedSyncId: id }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncEngineActive: (active) => set({ syncEngineActive: active }),
  reset: () => set({ lastAppliedSyncId: 0, pendingCount: 0, syncEngineActive: false }),
}))
