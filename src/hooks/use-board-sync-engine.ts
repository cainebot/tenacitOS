'use client'

/**
 * use-board-sync-engine.ts — React integration hook for the Kanban sync engine.
 *
 * Responsibilities:
 *   1. Boot the sync engine from IndexedDB on mount
 *   2. Connect to the board_sync_events Supabase Realtime channel
 *   3. Process sync events in sync_id order (with gap detection + catch-up)
 *   4. Expose moveSyncCard() to replace the store's raw moveCard() for drag ops
 *   5. Seed the engine from server data when useBoardData() resolves
 *
 * This hook replaces useStoreSyncRealtime for board ordering correctness.
 * useStoreSyncRealtime may still be used for non-board-ordering metadata
 * patches (title, description, labels, etc.).
 */

import { useEffect, useRef, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useBoardStore, type BoardColumn } from '@/stores/board-store'
import { useSyncStore } from '@/lib/kanban/sync-store'
import { SyncEngine } from '@/lib/kanban/sync-engine'
import type { SyncEvent } from '@/lib/kanban/sync-types'
import { getClientId } from '@/lib/kanban/local-db'

export interface UseBoardSyncEngineOptions {
  boardId: string
  /** Provide when server data is available so the engine can seed from it */
  serverColumns?: BoardColumn[]
  /** Called by the engine when a catch-up fetch is needed */
  onRefetch?: () => Promise<void>
}

export interface BoardSyncEngineHandle {
  /**
   * moveSyncCard — enqueue a local move mutation and fire the HTTP request.
   * The sync engine handles optimistic UI, ack tracking, and rebase.
   */
  moveSyncCard: (params: {
    cardId: string
    toStateId: string
    sortOrder: string
    boardId: string
  }) => Promise<void>

  /** Current client ID (for debugging / instrumentation) */
  clientId: string

  /** Number of pending mutations (not yet acked by server event) */
  pendingCount: number

  /** The last sync_id applied from the server event stream */
  lastAppliedSyncId: number
}

export function useBoardSyncEngine(
  options: UseBoardSyncEngineOptions,
): BoardSyncEngineHandle {
  const { boardId, serverColumns, onRefetch } = options

  const setStoreColumns = useBoardStore(s => s.setSyncColumns)
  const setSyncId = useSyncStore(s => s.setSyncId)
  const setPendingCount = useSyncStore(s => s.setPendingCount)
  const setClientId = useSyncStore(s => s.setClientId)
  const setSyncEngineActive = useSyncStore(s => s.setSyncEngineActive)

  const syncIdStore = useSyncStore(s => s.lastAppliedSyncId)
  const pendingCountStore = useSyncStore(s => s.pendingCount)

  // Stable refs for callbacks to avoid stale closures in effect
  const onRefetchRef = useRef(onRefetch)
  onRefetchRef.current = onRefetch

  // Engine instance — created once per boardId
  const engineRef = useRef<SyncEngine | null>(null)

  // Pending event buffer for out-of-order delivery
  const pendingEventBuffer = useRef<SyncEvent[]>([])

  // Helper: flush buffered events in order
  const flushBuffer = useCallback(async (engine: SyncEngine) => {
    const buffered = pendingEventBuffer.current
      .sort((a, b) => a.syncId - b.syncId)

    pendingEventBuffer.current = []
    for (const evt of buffered) {
      await engine.applyServerEvent(evt)
    }
    setSyncId(engine.currentLastAppliedSyncId)
    setPendingCount(engine.pendingCount)
  }, [setSyncId, setPendingCount])

  // ---- Engine lifecycle ----------------------------------------------------

  useEffect(() => {
    if (!boardId) return

    // Create engine for this boardId
    const engine = new SyncEngine({
      boardId,
      onColumnsChange: (cols) => {
        setStoreColumns(cols)
        setPendingCount(engine.pendingCount)
        setSyncId(engine.currentLastAppliedSyncId)
      },
      onCatchUpNeeded: (afterSyncId) => {
        // Trigger a catch-up fetch from the server
        void fetchCatchUp(engine, afterSyncId)
      },
    })

    engineRef.current = engine
    setClientId(getClientId())
    setSyncEngineActive(true)

    // Boot from IndexedDB — returns persisted columns for immediate render
    engine.boot().then(async (persistedCols) => {
      if (persistedCols) {
        setStoreColumns(persistedCols)
        setPendingCount(engine.pendingCount)
      }
    })

    // ---- Supabase Realtime: subscribe to sync events ---------------------

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`board-sync-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_sync_events',
          filter: `board_id=eq.${boardId}`,
        },
        async (payload) => {
          const raw = payload.new as {
            sync_id: number
            board_id: string
            entity_type: string
            entity_id: string
            operation: string
            payload: Record<string, unknown>
            origin_client_id: string | null
            origin_mutation_id: string | null
            created_at: string
          }

          const event: SyncEvent = {
            syncId: raw.sync_id,
            boardId: raw.board_id,
            entityType: raw.entity_type as SyncEvent['entityType'],
            entityId: raw.entity_id,
            operation: raw.operation as SyncEvent['operation'],
            payload: raw.payload,
            originClientId: raw.origin_client_id,
            originMutationId: raw.origin_mutation_id,
            createdAt: raw.created_at,
          }

          const currentEngine = engineRef.current
          if (!currentEngine) return

          // Check for gap: if this event is not the next expected one, buffer it
          const expected = currentEngine.currentLastAppliedSyncId + 1
          if (event.syncId > expected + 5) {
            // Large gap: trigger catch-up and buffer this event
            pendingEventBuffer.current.push(event)
            return
          }

          await currentEngine.applyServerEvent(event)
          setSyncId(currentEngine.currentLastAppliedSyncId)
          setPendingCount(currentEngine.pendingCount)

          // Flush any buffered events that may now be applicable
          if (pendingEventBuffer.current.length > 0) {
            await flushBuffer(currentEngine)
          }
        },
      )
      .subscribe()

    // Catch-up fetch helper (also used by onCatchUpNeeded callback)
    async function fetchCatchUp(eng: SyncEngine, afterSyncId: number) {
      try {
        const res = await fetch(
          `/api/boards/${boardId}/sync-events?after=${afterSyncId}`,
        )
        if (!res.ok) return
        const events: SyncEvent[] = await res.json()
        await eng.applyEventBatch(events)
        setSyncId(eng.currentLastAppliedSyncId)
        setPendingCount(eng.pendingCount)
      } catch {
        // Catch-up failed — board will reconcile on next event or explicit refetch
      }
    }

    return () => {
      supabase.removeChannel(channel)
      engine.reset()
      engineRef.current = null
      setSyncEngineActive(false)
      pendingEventBuffer.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])

  // ---- Seed engine from server data when it arrives -----------------------

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !serverColumns || serverColumns.length === 0) return
    engine.seedFromServer(serverColumns, 0)
  }, [serverColumns])

  // ---- Move mutation (replaces store.moveCard for sync-engine path) -------

  const moveSyncCard = useCallback(async (params: {
    cardId: string
    toStateId: string
    sortOrder: string
    boardId: string
  }) => {
    const engine = engineRef.current
    if (!engine) return

    // Enqueue local mutation (applies optimistic UI)
    const mutation = await engine.enqueueMutation({
      boardId: params.boardId,
      type: 'move-card',
      entityId: params.cardId,
      payload: { state_id: params.toStateId, sort_order: params.sortOrder },
    })

    setPendingCount(engine.pendingCount)

    // Fire HTTP request to move route with sync metadata
    try {
      await engine.markSent(mutation.clientMutationId)

      const res = await fetch(`/api/cards/${params.cardId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state_id: params.toStateId,
          moved_by: 'human',
          sort_order: params.sortOrder,
          board_id: params.boardId,
          client_id: engine.currentClientId,
          client_mutation_id: mutation.clientMutationId,
        }),
      })

      if (!res.ok) {
        await engine.failMutation(mutation.clientMutationId)
        setPendingCount(engine.pendingCount)
        return
      }

      const data = await res.json()
      if (data.accepted_sync_id != null) {
        await engine.updateMutationAccepted(
          mutation.clientMutationId,
          data.accepted_sync_id,
        )
      }
    } catch {
      await engine.failMutation(mutation.clientMutationId)
      setPendingCount(engine.pendingCount)
    }
  }, [setPendingCount])

  return {
    moveSyncCard,
    clientId: getClientId(),
    pendingCount: pendingCountStore,
    lastAppliedSyncId: syncIdStore,
  }
}
