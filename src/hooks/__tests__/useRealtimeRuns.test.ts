// Phase 69 Plan 05 — useRealtimeRuns unit tests.
//
// Guards (NEW BLOCKING acceptance 2026-04-20):
//   - Hook subscribes via supabase.channel(...) on postgres_changes.
//   - Hook does NOT import the old PHASE_69_RUNS / phase-69-fixtures
//     module (asserted via a file-grep in PLAN verification, not here).
//   - An initial fetchAllRuns resolves with the snapshot rows.
//   - A simulated INSERT postgres_changes event lands in `runs`.
//   - An UPDATE postgres_changes event replaces by id.
//   - A DELETE postgres_changes event removes by id.
//   - When `agentId` is set the channel is configured with the
//     `agent_id=eq.<id>` filter and the initial snapshot is scoped.
//   - Stable external contract `{ runs, loading, error, resync }`.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup, waitFor } from '@testing-library/react'
import type { AgentRunRow } from '@/types/supabase'

type RealtimeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: AgentRunRow
  old: Pick<AgentRunRow, 'id'>
}) => void

interface CapturedSubscription {
  topic: string
  on: { event: string; table: string; filter?: string }
  handler: RealtimeHandler
}

const captured: { current: CapturedSubscription | null } = { current: null }
const snapshotRows: { current: AgentRunRow[] } = { current: [] }
const fetchArgs: { current: { agentId?: string } | null } = { current: null }

// Minimal supabase-js-like query builder — thenable so the hook can
// `await query` after any chain of `.order / .limit / .eq`. Records
// whenever `.eq('agent_id', …)` is applied, regardless of chain order.
function makeQueryBuilder() {
  const exec = () =>
    Promise.resolve({ data: snapshotRows.current, error: null })
  const builder = {
    order: () => builder,
    limit: () => builder,
    eq: (col: string, val: unknown) => {
      if (col === 'agent_id') fetchArgs.current = { agentId: val as string }
      return builder
    },
    then: (
      onFulfilled?: (value: { data: AgentRunRow[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => exec().then(onFulfilled, onRejected),
  }
  return builder
}

// Minimal supabase-js-like client — channel().on().subscribe() +
// from().select()-chain.
function makeSupabaseStub() {
  return {
    from: (_table: string) => ({
      select: () => makeQueryBuilder(),
    }),
    channel: (topic: string) => {
      const chain = {
        on: (
          event: string,
          opts: { event: string; schema: string; table: string; filter?: string },
          handler: RealtimeHandler,
        ) => {
          captured.current = {
            topic,
            on: { event: opts.event, table: opts.table, filter: opts.filter },
            handler,
          }
          return chain
        },
        subscribe: () => ({ unsubscribe: () => undefined }),
      }
      return chain
    },
    removeChannel: () => undefined,
  }
}

// Singleton stub — matches production createBrowserClient shape where
// the browser client is memoised. Prevents renderHook rerenders from
// churning the useEffect dependencies on a fresh-identity supabase.
let supabaseSingleton: ReturnType<typeof makeSupabaseStub> | null = null
vi.mock('@/lib/supabase', () => ({
  createBrowserClient: () => {
    if (!supabaseSingleton) supabaseSingleton = makeSupabaseStub()
    return supabaseSingleton
  },
}))

// Import AFTER the mock so the hook closes over it.
import { useRealtimeRuns } from '../useRealtimeRuns'

function makeRun(partial: Partial<AgentRunRow> & Pick<AgentRunRow, 'id'>): AgentRunRow {
  return {
    id: partial.id,
    agent_id: partial.agent_id ?? 'gangle',
    target_node_id: null,
    node_id: partial.node_id ?? 'circus-01',
    adapter_type: partial.adapter_type ?? 'codex_local',
    status: partial.status ?? 'running',
    source: 'manual',
    source_ref: null,
    wake_reason: null,
    context: null,
    attempt: 1,
    max_attempts: 3,
    session_id: null,
    session_params: null,
    exit_code: partial.exit_code ?? null,
    signal: null,
    timed_out: null,
    usage_json: null,
    cost_usd: null,
    summary: null,
    result_json: null,
    error_message: null,
    error_code: null,
    queued_at: '2026-04-20T00:00:00Z',
    claimed_at: null,
    started_at: '2026-04-20T00:00:01Z',
    finished_at: partial.finished_at ?? null,
    created_at: '2026-04-20T00:00:00Z',
  }
}

beforeEach(() => {
  captured.current = null
  snapshotRows.current = []
  fetchArgs.current = null
  supabaseSingleton = null
})

afterEach(() => {
  cleanup()
})

describe('useRealtimeRuns', () => {
  it('subscribes to postgres_changes on agent_runs via supabase.channel()', async () => {
    renderHook(() => useRealtimeRuns())

    await waitFor(() => {
      expect(captured.current).not.toBeNull()
    })

    expect(captured.current!.on.event).toBe('*')
    expect(captured.current!.on.table).toBe('agent_runs')
    expect(captured.current!.topic).toMatch(/^agent-runs-realtime-/)
  })

  it('seeds `runs` from the initial snapshot fetch', async () => {
    snapshotRows.current = [
      makeRun({ id: 'r1' }),
      makeRun({ id: 'r2', status: 'completed' }),
    ]
    const { result } = renderHook(() => useRealtimeRuns())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.runs.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('adds a run when a postgres_changes INSERT event fires', async () => {
    snapshotRows.current = []
    const { result } = renderHook(() => useRealtimeRuns())

    await waitFor(() => {
      expect(captured.current).not.toBeNull()
    })

    const inserted = makeRun({ id: 'new-1' })
    act(() => {
      captured.current!.handler({
        eventType: 'INSERT',
        new: inserted,
        old: { id: '' },
      })
    })

    expect(result.current.runs.map((r) => r.id)).toContain('new-1')
  })

  it('updates a run in place on postgres_changes UPDATE', async () => {
    snapshotRows.current = [makeRun({ id: 'r1', status: 'running' })]
    const { result } = renderHook(() => useRealtimeRuns())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updated = makeRun({ id: 'r1', status: 'completed', exit_code: 0 })
    act(() => {
      captured.current!.handler({
        eventType: 'UPDATE',
        new: updated,
        old: { id: 'r1' },
      })
    })

    expect(result.current.runs[0]!.status).toBe('completed')
    expect(result.current.runs[0]!.exit_code).toBe(0)
  })

  it('removes a run on postgres_changes DELETE', async () => {
    snapshotRows.current = [makeRun({ id: 'r1' }), makeRun({ id: 'r2' })]
    const { result } = renderHook(() => useRealtimeRuns())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      captured.current!.handler({
        eventType: 'DELETE',
        new: {} as AgentRunRow,
        old: { id: 'r1' },
      })
    })

    expect(result.current.runs.map((r) => r.id)).toEqual(['r2'])
  })

  it('applies agent_id=eq.<id> filter to the Realtime channel when agentId passed', async () => {
    renderHook(() => useRealtimeRuns({ agentId: 'gangle' }))

    await waitFor(() => {
      expect(captured.current).not.toBeNull()
    })

    expect(captured.current!.on.filter).toBe('agent_id=eq.gangle')
  })

  it('scopes the initial snapshot fetch to the agentId', async () => {
    renderHook(() => useRealtimeRuns({ agentId: 'gangle' }))

    await waitFor(() => {
      expect(fetchArgs.current?.agentId).toBe('gangle')
    })
  })

  it('legacy positional form useRealtimeRuns("gangle") still sets the filter', async () => {
    renderHook(() => useRealtimeRuns('gangle'))

    await waitFor(() => {
      expect(captured.current).not.toBeNull()
    })

    expect(captured.current!.on.filter).toBe('agent_id=eq.gangle')
  })

  it('returns the stable contract {runs, loading, error, resync}', async () => {
    const { result } = renderHook(() => useRealtimeRuns())
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(Array.isArray(result.current.runs)).toBe(true)
    expect(typeof result.current.loading).toBe('boolean')
    expect(result.current.error === null || typeof result.current.error === 'string').toBe(true)
    expect(typeof result.current.resync).toBe('function')
  })
})
