import { describe, it, expect, beforeEach } from 'vitest'
import { RuntimeActivityAdapter } from './runtime-activity-adapter'
import type { RuntimeActivitySignal } from '../types'

// ── Factory helpers ──

function makeSignal(overrides: Partial<RuntimeActivitySignal> = {}): RuntimeActivitySignal {
  return {
    agent_id: 'agent-1',
    context_type: 'idle',
    event_id: 'evt-' + Math.random().toString(36).slice(2),
    emitted_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── Tests ──

describe('RuntimeActivityAdapter', () => {
  let adapter: RuntimeActivityAdapter

  beforeEach(() => {
    adapter = new RuntimeActivityAdapter()
  })

  describe('normalize() — basic output shape', () => {
    it('returns NormalizedActivity for a valid idle signal', () => {
      const signal = makeSignal({ context_type: 'idle' })
      const result = adapter.normalize(signal)
      expect(result).not.toBeNull()
      expect(result!.agent_id).toBe(signal.agent_id)
      expect(result!.context_type).toBe('idle')
    })

    it('sets received_at to a number (Date.now())', () => {
      const before = Date.now()
      const signal = makeSignal()
      const result = adapter.normalize(signal)
      const after = Date.now()
      expect(result).not.toBeNull()
      expect(typeof result!.received_at).toBe('number')
      expect(result!.received_at).toBeGreaterThanOrEqual(before)
      expect(result!.received_at).toBeLessThanOrEqual(after)
    })

    it('maps undefined optional fields to null', () => {
      const signal = makeSignal({ context_type: 'idle' }) // no board_id, room_capability, reason
      const result = adapter.normalize(signal)
      expect(result).not.toBeNull()
      expect(result!.board_id).toBeNull()
      expect(result!.room_capability).toBeNull()
      expect(result!.reason).toBeNull()
    })

    it('preserves board_id when present', () => {
      const signal = makeSignal({ context_type: 'board_task', board_id: 'board-42' })
      const result = adapter.normalize(signal)
      expect(result!.board_id).toBe('board-42')
    })

    it('preserves reason when present', () => {
      const signal = makeSignal({ context_type: 'error', reason: 'timeout' })
      const result = adapter.normalize(signal)
      expect(result!.reason).toBe('timeout')
    })
  })

  describe('normalize() — is_ephemeral flag', () => {
    it('sets is_ephemeral=true for context_type meeting', () => {
      const signal = makeSignal({ context_type: 'meeting' })
      const result = adapter.normalize(signal)
      expect(result!.is_ephemeral).toBe(true)
    })

    it('sets is_ephemeral=true for context_type room_activity with known capability', () => {
      const signal = makeSignal({ context_type: 'room_activity', room_capability: 'brainstorm' })
      const result = adapter.normalize(signal)
      expect(result!.is_ephemeral).toBe(true)
    })

    it('sets is_ephemeral=false for context_type idle', () => {
      const signal = makeSignal({ context_type: 'idle' })
      const result = adapter.normalize(signal)
      expect(result!.is_ephemeral).toBe(false)
    })

    it('sets is_ephemeral=false for context_type direct_task', () => {
      const signal = makeSignal({ context_type: 'direct_task', task_id: 'task-1' })
      const result = adapter.normalize(signal)
      expect(result!.is_ephemeral).toBe(false)
    })

    it('sets is_ephemeral=false for context_type board_task', () => {
      const signal = makeSignal({ context_type: 'board_task', board_id: 'board-1' })
      const result = adapter.normalize(signal)
      expect(result!.is_ephemeral).toBe(false)
    })

    it('sets is_ephemeral=false for context_type error', () => {
      const signal = makeSignal({ context_type: 'error', reason: 'crash' })
      const result = adapter.normalize(signal)
      expect(result!.is_ephemeral).toBe(false)
    })
  })

  describe('normalize() — event_id deduplication', () => {
    it('returns null on second call with same event_id', () => {
      const signal = makeSignal({ event_id: 'fixed-event-id-1' })
      const first = adapter.normalize(signal)
      const second = adapter.normalize(signal)
      expect(first).not.toBeNull()
      expect(second).toBeNull()
    })

    it('returns null for third call with same event_id', () => {
      const signal = makeSignal({ event_id: 'fixed-event-id-2' })
      adapter.normalize(signal)
      adapter.normalize(signal)
      const third = adapter.normalize(signal)
      expect(third).toBeNull()
    })

    it('allows different event_ids through', () => {
      const signal1 = makeSignal({ event_id: 'evt-aaa', agent_id: 'agent-1' })
      const signal2 = makeSignal({ event_id: 'evt-bbb', agent_id: 'agent-1' })
      const result1 = adapter.normalize(signal1)
      const result2 = adapter.normalize(signal2)
      expect(result1).not.toBeNull()
      expect(result2).not.toBeNull()
    })

    it('dedup is per adapter instance (new instance resets seen set)', () => {
      const signal = makeSignal({ event_id: 'shared-event-id' })
      adapter.normalize(signal) // first adapter marks as seen

      const adapter2 = new RuntimeActivityAdapter()
      const result = adapter2.normalize(signal) // new adapter has clean state
      expect(result).not.toBeNull()
    })
  })

  describe('normalize() — unknown room_capability', () => {
    it('returns idle context for unknown room_capability string', () => {
      const signal = makeSignal({
        context_type: 'room_activity',
        room_capability: 'totally_made_up',
      })
      const result = adapter.normalize(signal)
      expect(result).not.toBeNull()
      expect(result!.context_type).toBe('idle')
      expect(result!.room_capability).toBeNull()
      expect(result!.is_ephemeral).toBe(false)
    })

    it('event_id is still deduplicated for unknown capability signal', () => {
      const signal = makeSignal({
        event_id: 'unknown-cap-evt',
        context_type: 'room_activity',
        room_capability: 'nonexistent_cap',
      })
      adapter.normalize(signal) // normalizes to idle, marks event_id as seen
      const second = adapter.normalize(signal)
      expect(second).toBeNull()
    })

    it('accepts known room capabilities without downgrading to idle', () => {
      const knownCaps = ['brainstorm', 'standup', 'qa_lab', 'call', 'review', 'social', 'idle_activity']
      for (const cap of knownCaps) {
        const a = new RuntimeActivityAdapter()
        const signal = makeSignal({ context_type: 'room_activity', room_capability: cap })
        const result = a.normalize(signal)
        expect(result!.context_type).toBe('room_activity')
        expect(result!.room_capability).toBe(cap)
      }
    })
  })
})
