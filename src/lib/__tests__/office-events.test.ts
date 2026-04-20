// Phase 69 Plan 04 — office-events bus unit tests.
// Closes REVIEW finding 8: duplicate spawn/despawn must be collapsed at
// the bus boundary so StrictMode double-subscription does not cause the
// /office page's 500 ms despawn timer to thrash.

import { describe, it, expect, beforeEach } from 'vitest'
import { __testables, type OfficeEvent, type OfficeBus } from '../office-events'

const { createOfficeBus } = __testables

function spawn(agent_id: string, overrides: Partial<Extract<OfficeEvent, { type: 'spawn' }>> = {}): OfficeEvent {
  return {
    type: 'spawn',
    agent_id,
    slug: agent_id,
    name: agent_id.toUpperCase(),
    avatar_url: null,
    status: 'idle',
    ...overrides,
  }
}

function despawn(agent_id: string): OfficeEvent {
  return { type: 'despawn', agent_id }
}

function update(
  agent_id: string,
  overrides: Partial<Extract<OfficeEvent, { type: 'update' }>> = {},
): OfficeEvent {
  return {
    type: 'update',
    agent_id,
    slug: agent_id,
    name: agent_id.toUpperCase(),
    avatar_url: null,
    status: 'idle',
    ...overrides,
  }
}

describe('lib/office-events', () => {
  let bus: OfficeBus

  beforeEach(() => {
    bus = createOfficeBus()
  })

  it('on() returns an unsubscribe fn and detaches the handler', () => {
    const received: OfficeEvent[] = []
    const off = bus.on((e) => received.push(e))
    bus.emit(spawn('a'))
    off()
    bus.emit(spawn('b'))
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ type: 'spawn', agent_id: 'a' })
  })

  it('drops a duplicate spawn for the same agent_id (REVIEW finding 8)', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(spawn('a'))
    bus.emit(spawn('a'))
    expect(received).toHaveLength(1)
  })

  it('drops a duplicate despawn for the same agent_id (REVIEW finding 8)', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(spawn('a'))
    bus.emit(despawn('a'))
    bus.emit(despawn('a'))
    // spawn + one despawn = 2 events; the second despawn is collapsed.
    expect(received.filter((e) => e.type === 'despawn')).toHaveLength(1)
  })

  it('allows spawn → despawn → spawn as three distinct events', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(spawn('a'))
    bus.emit(despawn('a'))
    bus.emit(spawn('a'))
    expect(received).toHaveLength(3)
    expect(received.map((e) => e.type)).toEqual(['spawn', 'despawn', 'spawn'])
  })

  it('ignores despawn for an agent_id that was never spawned', () => {
    // A phantom despawn (e.g., deleted agent the office surface never saw)
    // would thrash the 500 ms timer cleanup if it fired.
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(despawn('ghost'))
    expect(received).toHaveLength(0)
  })

  it('de-dupes byte-identical update payloads per agent_id', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(update('a'))
    bus.emit(update('a'))
    expect(received).toHaveLength(1)
  })

  it('fires update when any field changes', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(update('a', { name: 'A' }))
    bus.emit(update('a', { name: 'A2' }))
    bus.emit(update('a', { avatar_url: 'https://x/y.png', name: 'A2' }))
    bus.emit(update('a', { avatar_url: 'https://x/y.png', name: 'A2' })) // dup, dropped
    bus.emit(update('a', { status: 'working', avatar_url: 'https://x/y.png', name: 'A2' }))
    expect(received.filter((e) => e.type === 'update')).toHaveLength(4)
  })

  it('fans out to multiple handlers; unsubscribe mid-dispatch is safe', () => {
    const aReceived: OfficeEvent[] = []
    const bReceived: OfficeEvent[] = []
    let offB: (() => void) | null = null
    bus.on((e) => {
      aReceived.push(e)
      // A drops B during dispatch — B must still see THIS event but not
      // the next one (snapshot semantics).
      offB?.()
    })
    offB = bus.on((e) => bReceived.push(e))
    bus.emit(spawn('a'))
    bus.emit(spawn('b'))
    expect(aReceived).toHaveLength(2)
    expect(bReceived).toHaveLength(1)
    expect(bReceived[0]).toMatchObject({ agent_id: 'a' })
  })

  it('fresh spawn after despawn invalidates cached update fingerprint', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(spawn('a'))
    bus.emit(update('a', { name: 'A' }))
    // Same update content, but after a respawn, must fire again.
    bus.emit(despawn('a'))
    bus.emit(spawn('a'))
    bus.emit(update('a', { name: 'A' }))
    const updates = received.filter((e) => e.type === 'update')
    expect(updates).toHaveLength(2)
  })

  it('reset() clears handlers and idempotency state', () => {
    const received: OfficeEvent[] = []
    bus.on((e) => received.push(e))
    bus.emit(spawn('a'))
    bus.reset()
    bus.emit(spawn('a')) // no handler attached
    expect(received).toHaveLength(1)
  })
})
