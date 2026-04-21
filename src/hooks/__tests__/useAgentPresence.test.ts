// Phase 69 Plan 04 — useAgentPresence unit tests.
//
// Covers SPEC-69-OFFICE-01:
//   - New agent_id in useRealtimeAgents → spawn event
//   - Removed agent_id → despawn event
//   - deleted_at set (soft-delete) → despawn event
//   - Name/avatar/status change → update event
//
// The bus's own dedup tests live in office-events.test.ts; here we only
// assert the bridge correctness from `useRealtimeAgents.agents[]` to
// `officeEvents.emit()`.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import type { AgentRow } from '@/types/supabase'

// Mock the Realtime hook — controlled per-test via `mockAgents`.
let mockAgents: AgentRow[] = []
vi.mock('@/hooks/useRealtimeAgents', () => ({
  useRealtimeAgents: () => ({
    agents: mockAgents,
    loading: false,
    error: null,
    resync: vi.fn(),
  }),
}))

// Replace the bus singleton's emit with a spy so we can observe calls
// without reaching into private state. We intercept at module load.
const emitSpy = vi.fn()
vi.mock('@/lib/office-events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/office-events')>()
  return {
    ...actual,
    officeEvents: {
      on: actual.officeEvents.on,
      emit: (...args: unknown[]) => {
        emitSpy(...args)
        return (actual.officeEvents.emit as unknown as (...a: unknown[]) => void)(...args)
      },
      reset: actual.officeEvents.reset,
    },
  }
})

// Import AFTER mocks so the hook closes over the mocked modules.
import { useAgentPresence } from '../useAgentPresence'
import { officeEvents } from '@/lib/office-events'

function makeAgent(partial: Partial<AgentRow> & Pick<AgentRow, 'agent_id' | 'name'>): AgentRow {
  return {
    agent_id: partial.agent_id,
    node_id: partial.node_id ?? 'circus-01',
    name: partial.name,
    emoji: '🤖',
    status: partial.status ?? 'idle',
    current_task_id: null,
    avatar_model: '',
    last_activity: '2026-04-20T00:00:00Z',
    metadata: {},
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    slug: partial.slug ?? partial.agent_id,
    soul_content: partial.soul_content ?? '',
    adapter_type: partial.adapter_type ?? 'codex',
    avatar_url: partial.avatar_url ?? null,
    deleted_at: partial.deleted_at ?? null,
  } as AgentRow
}

beforeEach(() => {
  emitSpy.mockReset()
  officeEvents.reset()
  mockAgents = []
})

afterEach(() => {
  cleanup()
})

describe('useAgentPresence', () => {
  it('emits spawn for each agent present on first mount', () => {
    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha' })]

    renderHook(() => useAgentPresence())

    const spawnCalls = emitSpy.mock.calls.filter(
      (args) => (args[0] as { type: string }).type === 'spawn',
    )
    expect(spawnCalls).toHaveLength(1)
    expect(spawnCalls[0][0]).toMatchObject({ type: 'spawn', agent_id: 'a', name: 'Alpha' })
  })

  it('emits spawn when a new agent_id appears in the list', () => {
    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha' })]
    const { rerender } = renderHook(() => useAgentPresence())
    emitSpy.mockClear()

    mockAgents = [
      makeAgent({ agent_id: 'a', name: 'Alpha' }),
      makeAgent({ agent_id: 'b', name: 'Beta' }),
    ]
    rerender()

    const spawnCalls = emitSpy.mock.calls.filter(
      (args) => (args[0] as { type: string }).type === 'spawn',
    )
    expect(spawnCalls).toHaveLength(1)
    expect(spawnCalls[0][0]).toMatchObject({ type: 'spawn', agent_id: 'b', name: 'Beta' })
  })

  it('emits despawn when an agent is soft-deleted (deleted_at set)', () => {
    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha' })]
    const { rerender } = renderHook(() => useAgentPresence())
    emitSpy.mockClear()

    mockAgents = [
      makeAgent({ agent_id: 'a', name: 'Alpha', deleted_at: '2026-04-19T10:00:00Z' }),
    ]
    rerender()

    const despawnCalls = emitSpy.mock.calls.filter(
      (args) => (args[0] as { type: string }).type === 'despawn',
    )
    expect(despawnCalls).toHaveLength(1)
    expect(despawnCalls[0][0]).toMatchObject({ type: 'despawn', agent_id: 'a' })
  })

  it('emits despawn when an agent row disappears from the list', () => {
    mockAgents = [
      makeAgent({ agent_id: 'a', name: 'Alpha' }),
      makeAgent({ agent_id: 'b', name: 'Beta' }),
    ]
    const { rerender } = renderHook(() => useAgentPresence())
    emitSpy.mockClear()

    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha' })]
    rerender()

    const despawnCalls = emitSpy.mock.calls.filter(
      (args) => (args[0] as { type: string }).type === 'despawn',
    )
    expect(despawnCalls).toHaveLength(1)
    expect(despawnCalls[0][0]).toMatchObject({ type: 'despawn', agent_id: 'b' })
  })

  it('emits update when a name/avatar/status changes', () => {
    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha', status: 'idle' })]
    const { rerender } = renderHook(() => useAgentPresence())
    emitSpy.mockClear()

    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha', status: 'working' })]
    rerender()

    const updateCalls = emitSpy.mock.calls.filter(
      (args) => (args[0] as { type: string }).type === 'update',
    )
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0][0]).toMatchObject({ type: 'update', agent_id: 'a', status: 'working' })
  })

  it('does not emit update when a re-render produces identical rows', () => {
    const agent = makeAgent({ agent_id: 'a', name: 'Alpha' })
    mockAgents = [agent]
    const { rerender } = renderHook(() => useAgentPresence())
    emitSpy.mockClear()

    // Same content, fresh array identity — diff gate should drop it.
    mockAgents = [makeAgent({ agent_id: 'a', name: 'Alpha' })]
    rerender()

    const updateCalls = emitSpy.mock.calls.filter(
      (args) => (args[0] as { type: string }).type === 'update',
    )
    expect(updateCalls).toHaveLength(0)
  })

  it('returns presence filtered to deleted_at IS NULL', () => {
    mockAgents = [
      makeAgent({ agent_id: 'a', name: 'Alpha' }),
      makeAgent({ agent_id: 'b', name: 'Beta', deleted_at: '2026-04-19T10:00:00Z' }),
    ]
    const { result } = renderHook(() => useAgentPresence())
    expect(result.current.presence.map((p) => p.agent_id)).toEqual(['a'])
  })
})
