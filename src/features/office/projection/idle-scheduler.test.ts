import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IdleScheduler, pickRandomPOI, pickFlavorText } from './idle-scheduler'
import { HARDCODED_POIS } from './zone-seed'

describe('IdleScheduler', () => {
  let scheduler: IdleScheduler

  beforeEach(() => {
    vi.useFakeTimers()
    scheduler = new IdleScheduler()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scheduleWander calls callback after delay between 30000-120000ms', () => {
    const cb = vi.fn()
    scheduler.scheduleWander('agent-1', cb)

    // Should not fire before 30s
    vi.advanceTimersByTime(29_999)
    expect(cb).not.toHaveBeenCalled()

    // Should fire by 120s
    vi.advanceTimersByTime(90_001)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('two agents get different delays (stagger)', () => {
    // Schedule two agents and check which fires first
    let agent1FiredAt = -1
    let agent2FiredAt = -1
    let elapsed = 0

    scheduler.scheduleWander('agent-1', () => { agent1FiredAt = elapsed })
    scheduler.scheduleWander('agent-2', () => { agent2FiredAt = elapsed })

    // Advance in increments to find exact fire times
    for (let i = 0; i < 121_000; i += 1_000) {
      vi.advanceTimersByTime(1_000)
      elapsed += 1_000
    }

    // Both should have fired
    expect(agent1FiredAt).toBeGreaterThan(-1)
    expect(agent2FiredAt).toBeGreaterThan(-1)

    // They should NOT fire at exactly the same time (staggered)
    expect(agent1FiredAt).not.toBe(agent2FiredAt)
  })

  it('cancelWander prevents callback from firing', () => {
    const cb = vi.fn()
    scheduler.scheduleWander('agent-1', cb)
    scheduler.cancelWander('agent-1')

    vi.advanceTimersByTime(120_001)
    expect(cb).not.toHaveBeenCalled()
  })

  it('cancelAll prevents all callbacks from firing', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    scheduler.scheduleWander('agent-1', cb1)
    scheduler.scheduleWander('agent-2', cb2)
    scheduler.cancelAll()

    vi.advanceTimersByTime(120_001)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
  })

  it('scheduling same agent twice cancels first timer', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    scheduler.scheduleWander('agent-1', cb1)
    // Schedule again for same agent — should cancel cb1
    scheduler.scheduleWander('agent-1', cb2)

    expect(scheduler.pendingCount).toBe(1) // Only one timer remains

    vi.advanceTimersByTime(120_001)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledTimes(1)
  })
})

describe('pickRandomPOI', () => {
  it('returns a POI object from HARDCODED_POIS', () => {
    const poi = pickRandomPOI()
    expect(poi).toBeDefined()
    expect(poi.id).toBeTruthy()
    expect(poi.type).toBeTruthy()
    expect(Array.isArray(poi.flavorTexts)).toBe(true)
    // Should be one of the HARDCODED_POIS
    expect(HARDCODED_POIS).toContainEqual(poi)
  })

  it('excludes specified POI id', () => {
    const firstPoi = HARDCODED_POIS[0]
    // Run 20 times to ensure exclusion is consistent
    for (let i = 0; i < 20; i++) {
      const poi = pickRandomPOI(firstPoi.id)
      expect(poi.id).not.toBe(firstPoi.id)
    }
  })
})

describe('pickFlavorText', () => {
  it('returns a string from the POI flavorTexts array', () => {
    const poi = HARDCODED_POIS[0]
    const text = pickFlavorText(poi)
    expect(typeof text).toBe('string')
    expect(poi.flavorTexts).toContain(text)
  })
})
