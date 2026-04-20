// Phase 69 Plan 04 — Office presence event bus.
//
// Singleton bus that bridges `useRealtimeAgents` emissions into the pixel
// office surface. Pattern lifted from Claw3D `OfficeSceneBridge.subscribe/
// setState` (PATTERNS §5), augmented with a per-agent idempotency map to
// close REVIEW finding 8 (StrictMode double-subscription).
//
// Contract (SPEC-69-OFFICE-01):
//   - `on(handler) → unsubscribe`
//   - `emit(event)` — fans out to subscribers, de-duping identical
//     spawn/despawn transitions per agent_id and identical update payloads
//     per agent_id.
//
// Branch (b) of REVIEW finding 8 is intentional: the shared
// `useRealtimeAgents` hook is NOT patched to use a mount-unique topic.
// Dedup happens at the bus boundary so existing consumers (sidebar badge,
// /agents page) are unaffected.

export type OfficeEvent =
  | {
      type: 'spawn'
      agent_id: string
      slug: string
      name: string
      avatar_url: string | null
      status: string
    }
  | {
      type: 'despawn'
      agent_id: string
    }
  | {
      type: 'update'
      agent_id: string
      slug: string
      name: string
      avatar_url: string | null
      status: string
    }

export type OfficeEventHandler = (event: OfficeEvent) => void

export type OfficeBus = {
  on: (handler: OfficeEventHandler) => () => void
  emit: (event: OfficeEvent) => void
  /**
   * Test-only: reset internal state. Not exported via the public bus;
   * re-imported explicitly under __testables.
   */
  reset: () => void
}

type PresenceMark = 'spawned' | 'despawned'

type UpdateFingerprint = string

function fingerprintUpdate(e: Extract<OfficeEvent, { type: 'update' }>): UpdateFingerprint {
  // Stable JSON-ish fingerprint over the fields the bus de-dupes by.
  // `JSON.stringify` key order is insertion-defined; we control the shape.
  return `${e.slug}\u0000${e.name}\u0000${e.avatar_url ?? ''}\u0000${e.status}`
}

function createOfficeBus(): OfficeBus {
  const handlers = new Set<OfficeEventHandler>()
  const presenceMarks = new Map<string, PresenceMark>()
  const lastUpdateFingerprint = new Map<string, UpdateFingerprint>()

  const on: OfficeBus['on'] = (handler) => {
    handlers.add(handler)
    return () => {
      handlers.delete(handler)
    }
  }

  const emit: OfficeBus['emit'] = (event) => {
    // Idempotency gate — drop no-op transitions before firing handlers.
    if (event.type === 'spawn') {
      if (presenceMarks.get(event.agent_id) === 'spawned') {
        return
      }
      presenceMarks.set(event.agent_id, 'spawned')
      // Reset any cached update fingerprint; a fresh spawn invalidates it.
      lastUpdateFingerprint.delete(event.agent_id)
    } else if (event.type === 'despawn') {
      if (presenceMarks.get(event.agent_id) === 'despawned') {
        return
      }
      // If the agent was never spawned, still record the mark so duplicate
      // despawns collapse — but do not fan out.
      const prior = presenceMarks.get(event.agent_id)
      presenceMarks.set(event.agent_id, 'despawned')
      lastUpdateFingerprint.delete(event.agent_id)
      if (prior === undefined) {
        // Never-seen agent_id: no handlers should fire for a phantom despawn.
        return
      }
    } else {
      // update — fires unless payload is byte-identical to last emitted.
      const fp = fingerprintUpdate(event)
      if (lastUpdateFingerprint.get(event.agent_id) === fp) {
        return
      }
      lastUpdateFingerprint.set(event.agent_id, fp)
    }

    // Snapshot handlers before fan-out so an unsubscribe during dispatch
    // does not skip a sibling handler mid-iteration.
    for (const handler of Array.from(handlers)) {
      handler(event)
    }
  }

  const reset: OfficeBus['reset'] = () => {
    handlers.clear()
    presenceMarks.clear()
    lastUpdateFingerprint.clear()
  }

  return { on, emit, reset }
}

/**
 * Module-scoped singleton. All consumers across the React tree share one
 * bus — necessary so `useAgentPresence` (mounted once) and page-local
 * subscribers (/office/page.tsx) observe the same event stream.
 */
export const officeEvents: OfficeBus = createOfficeBus()

/** Test-only handles; do not import from production code. */
export const __testables = {
  createOfficeBus,
  fingerprintUpdate,
}
