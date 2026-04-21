'use client'

// Phase 69 Plan 04 — useAgentPresence.
//
// Wraps the shared `useRealtimeAgents` hook and bridges its emissions into
// the `officeEvents` bus. Computes a presence snapshot filtered to
// `deleted_at IS NULL` and diffs against the previous render to emit
// `spawn` / `despawn` / `update` events.
//
// The bus itself is idempotent (REVIEW finding 8 branch b), so we can
// safely emit on every diff without fearing React StrictMode's double
// subscription. This hook MUST NOT mutate `useRealtimeAgents` — that
// hook is shared by the sidebar badge and the /agents page; Plan 04
// owes consumer-side code only.

import { useEffect, useMemo, useRef } from 'react'
import { useRealtimeAgents } from '@/hooks/useRealtimeAgents'
import { officeEvents, type OfficeEvent } from '@/lib/office-events'
import type { AgentRow } from '@/types/supabase'

export interface AgentPresence {
  agent_id: string
  slug: string
  name: string
  avatar_url: string | null
  status: string
}

export interface UseAgentPresenceResult {
  presence: AgentPresence[]
  loading: boolean
  error: string | null
}

/**
 * Convert an AgentRow to a lean presence record. Falls back to agent_id
 * where slug is missing (legacy rows pre-Phase 62 migration 002).
 */
function toPresence(row: AgentRow): AgentPresence {
  return {
    agent_id: row.agent_id,
    slug: row.slug ?? row.agent_id,
    name: row.name,
    avatar_url: row.avatar_url ?? null,
    status: String(row.status ?? 'idle'),
  }
}

/**
 * Stable presence fingerprint used as a cheap diff gate across renders.
 * The bus is the authoritative idempotency boundary — this is only to
 * skip the diff loop on identical snapshots.
 */
function fingerprintPresence(p: AgentPresence): string {
  return `${p.agent_id}\u0000${p.slug}\u0000${p.name}\u0000${p.avatar_url ?? ''}\u0000${p.status}`
}

export function useAgentPresence(): UseAgentPresenceResult {
  const { agents, loading, error } = useRealtimeAgents()

  // Presence snapshot, keyed by agent_id, derived once per `agents` change.
  // Soft-delete (deleted_at !== null) = despawn, so we filter here.
  const presence = useMemo<AgentPresence[]>(
    () =>
      agents
        .filter((a) => (a.deleted_at ?? null) === null)
        .map(toPresence),
    [agents],
  )

  // Track the previous presence map so we can diff on every render. Using
  // a ref (not state) keeps the diff synchronous and avoids an extra
  // render cycle.
  const prevByIdRef = useRef<Map<string, AgentPresence>>(new Map())

  useEffect(() => {
    const nextById = new Map<string, AgentPresence>()
    for (const p of presence) nextById.set(p.agent_id, p)

    const prevById = prevByIdRef.current

    // Spawns: in next but not in prev.
    for (const [id, next] of nextById) {
      if (!prevById.has(id)) {
        const event: Extract<OfficeEvent, { type: 'spawn' }> = {
          type: 'spawn',
          agent_id: id,
          slug: next.slug,
          name: next.name,
          avatar_url: next.avatar_url,
          status: next.status,
        }
        officeEvents.emit(event)
      }
    }

    // Despawns: in prev but not in next (soft-delete or removed row).
    for (const [id] of prevById) {
      if (!nextById.has(id)) {
        officeEvents.emit({ type: 'despawn', agent_id: id })
      }
    }

    // Updates: in both, but fingerprint changed.
    for (const [id, next] of nextById) {
      const prev = prevById.get(id)
      if (!prev) continue
      if (fingerprintPresence(prev) === fingerprintPresence(next)) continue
      const event: Extract<OfficeEvent, { type: 'update' }> = {
        type: 'update',
        agent_id: id,
        slug: next.slug,
        name: next.name,
        avatar_url: next.avatar_url,
        status: next.status,
      }
      officeEvents.emit(event)
    }

    prevByIdRef.current = nextById
    // `presence` is the only dependency — identity changes on real diffs.
  }, [presence])

  return { presence, loading, error }
}
