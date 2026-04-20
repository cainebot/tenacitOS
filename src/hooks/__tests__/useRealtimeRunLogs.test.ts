// Phase 69 Plan 05 — useRealtimeRunLogs unit tests.
//
// Guards:
//   - runId=null → no fetch, inert hook.
//   - active=false → no fetch, inert hook (SPEC-69-LOGS-04).
//   - Mount with active=true → first fetch resolves with chunks.
//   - Polling cadence: second fetch fires after 2s tick with cursor advanced.
//   - Chunk cap: buffer trims to 500 oldest-dropped.
//   - Active flips true → false → polling stops within one tick.
//
// Uses fake timers + explicit flushing. We avoid @testing-library's
// `waitFor` because it installs its own real-time polling loop which
// deadlocks under `vi.useFakeTimers()`.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import type { AgentRunLogRow } from '@/types/supabase'

// Capture fetch calls + drive responses per-test.
const fetchMock = vi.fn()
const realFetch = globalThis.fetch

// Must mirror the constant inside the hook.
const POLL_MS = 2_000

const RUN_ID = '11111111-2222-3333-4444-555555555555'

beforeEach(() => {
  fetchMock.mockReset()
  // Default response: empty page, no cursor.
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ chunks: [], nextCursor: null }),
  })
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = realFetch
  cleanup()
})

import { useRealtimeRunLogs } from '../useRealtimeRunLogs'

function makeChunk(partial: Partial<AgentRunLogRow> & { id: number }): AgentRunLogRow {
  return {
    id: partial.id,
    run_id: partial.run_id ?? RUN_ID,
    stream: partial.stream ?? 'stdout',
    chunk: partial.chunk ?? `chunk-${partial.id}`,
    ts: partial.ts ?? '2026-04-20T00:00:00Z',
  }
}

/** Let all pending microtasks + fetch promise resolutions settle inside
 *  the hook's effect body. Equivalent to "spin the event loop a few
 *  times" under fake timers. */
async function flush() {
  await act(async () => {
    // Tiny real-time wait to let queued microtasks drain.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useRealtimeRunLogs', () => {
  it('returns inert state when runId is null', async () => {
    const { result } = renderHook(() =>
      useRealtimeRunLogs(null, { active: true }),
    )
    await flush()
    expect(result.current.chunks).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns inert state when active is false (SPEC-69-LOGS-04)', async () => {
    const { result } = renderHook(() =>
      useRealtimeRunLogs(RUN_ID, { active: false }),
    )
    await flush()
    expect(result.current.chunks).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('performs an initial fetch when active=true and seeds chunks', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        chunks: [makeChunk({ id: 1 }), makeChunk({ id: 2 })],
        nextCursor: null,
      }),
    })

    const { result } = renderHook(() =>
      useRealtimeRunLogs(RUN_ID, { active: true }),
    )

    await flush()

    expect(result.current.chunks.map((c) => c.id)).toEqual([1, 2])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstUrl = fetchMock.mock.calls[0]![0] as string
    expect(firstUrl).toContain(`/api/agent-runs/${RUN_ID}/logs`)
    expect(firstUrl).toContain('after=0')
  })

  it('polls every 2s with advancing cursor', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          chunks: [makeChunk({ id: 1 }), makeChunk({ id: 2 })],
          nextCursor: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          chunks: [makeChunk({ id: 3 }), makeChunk({ id: 4 })],
          nextCursor: null,
        }),
      })

    const { result } = renderHook(() =>
      useRealtimeRunLogs(RUN_ID, { active: true }),
    )

    await flush()
    expect(result.current.chunks.map((c) => c.id)).toEqual([1, 2])

    // Advance to the next poll tick + let its promise settle.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.chunks.map((c) => c.id)).toEqual([1, 2, 3, 4])

    const secondUrl = fetchMock.mock.calls[1]![0] as string
    expect(secondUrl).toContain('after=2')
  })

  it('caps chunks at 500 — drops oldest on overflow', async () => {
    const firstBatch = Array.from({ length: 500 }, (_, i) =>
      makeChunk({ id: i + 1 }),
    )
    const secondBatch = Array.from({ length: 10 }, (_, i) =>
      makeChunk({ id: 500 + i + 1 }),
    )
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ chunks: firstBatch, nextCursor: 500 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ chunks: secondBatch, nextCursor: null }),
      })

    const { result } = renderHook(() =>
      useRealtimeRunLogs(RUN_ID, { active: true }),
    )

    await flush()
    expect(result.current.chunks.length).toBe(500)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    await flush()

    expect(result.current.chunks.length).toBe(500)
    expect(result.current.chunks[0]!.id).toBe(11)
    expect(result.current.chunks[499]!.id).toBe(510)
  })

  it('stops polling when active flips from true to false within one tick', async () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useRealtimeRunLogs(RUN_ID, { active }),
      { initialProps: { active: true } },
    )

    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Flip to terminal — polling must stop.
    rerender({ active: false })
    await flush()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * POLL_MS)
    })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces server-side HTTP error in `error`', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'db_error', message: 'connection refused' }),
    })

    const { result } = renderHook(() =>
      useRealtimeRunLogs(RUN_ID, { active: true }),
    )

    await flush()
    expect(result.current.error).toBe('connection refused')
  })
})
