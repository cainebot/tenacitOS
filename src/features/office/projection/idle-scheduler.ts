import type { POI } from '../types'

// Stagger range: 30-120 seconds
const MIN_IDLE_MS = 30_000
const MAX_IDLE_MS = 120_000

// Agent-specific offset to stagger timers (avoids synchronized wandering)
function staggerDelay(agentIndex: number, totalAgents: number): number {
  const range = MAX_IDLE_MS - MIN_IDLE_MS
  // Distribute agents evenly across the range, then add jitter
  const baseOffset = (agentIndex / Math.max(totalAgents, 1)) * range
  const jitter = Math.random() * (range / totalAgents)
  return MIN_IDLE_MS + baseOffset + jitter
}

export class IdleScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private agentIndex = new Map<string, number>()
  private nextIndex = 0

  scheduleWander(agentId: string, callback: () => void): void {
    // Cancel existing timer for this agent
    this.cancelWander(agentId)

    // Assign stable index for stagger
    if (!this.agentIndex.has(agentId)) {
      this.agentIndex.set(agentId, this.nextIndex++)
    }

    const delay = staggerDelay(
      this.agentIndex.get(agentId)!,
      Math.max(this.agentIndex.size, 7)  // 7 agents expected
    )

    const timerId = setTimeout(() => {
      this.timers.delete(agentId)
      callback()
    }, delay)

    this.timers.set(agentId, timerId)
  }

  cancelWander(agentId: string): void {
    const timerId = this.timers.get(agentId)
    if (timerId != null) {
      clearTimeout(timerId)
      this.timers.delete(agentId)
    }
  }

  cancelAll(): void {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId)
    }
    this.timers.clear()
  }

  /** Visible for testing */
  get pendingCount(): number {
    return this.timers.size
  }
}

/** Pick a random POI, optionally excluding one by id */
export function pickRandomPOI(pois: POI[], excludeId?: string): POI {
  const candidates = excludeId
    ? pois.filter(p => p.id !== excludeId)
    : pois
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/** Pick a random flavor text from a POI */
export function pickFlavorText(poi: POI): string {
  return poi.flavorTexts[Math.floor(Math.random() * poi.flavorTexts.length)]
}
