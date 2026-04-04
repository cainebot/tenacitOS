import type { NavGrid } from '../pathfinding/nav-grid'
import { findPath } from '../pathfinding/pathfinder'
import type { AgentSprite } from '../entities/agent-sprite'
import type { POI } from '@/features/office/types'
import { HARDCODED_POIS } from '@/features/office/projection/zone-seed'

/** Per-agent idle wandering state */
interface WanderState {
  phase: 'idle' | 'walking-to-poi' | 'at-poi' | 'walking-to-desk'
  targetPOI: POI | null
  deskGridX: number
  deskGridY: number
  atPoiTimer: ReturnType<typeof setTimeout> | null
}

/**
 * Phaser-layer system managing per-agent POI wandering.
 * Called from AgentManager when idle behavior is triggered.
 *
 * Lifecycle: idle -> walking-to-poi -> at-poi (10-20s) -> walking-to-desk -> idle
 */
export class IdleBehavior {
  private states = new Map<string, WanderState>()

  constructor(private navGrid: NavGrid) {}

  /**
   * Start an idle wander for the given agent.
   * Picks a random POI, computes A* path, commands agent to walk.
   */
  startWander(agent: AgentSprite, deskGridX: number, deskGridY: number): void {
    const agentId = agent.agentData.agent_id

    // Cancel any existing wander
    this.cancelWander(agentId)

    // Pick random POI
    const poi = this.pickRandomPOI()
    if (!poi) return

    // Compute path from current position to POI
    const cellSize = this.navGrid.cellSize
    const startX = Math.floor(agent.sprite.x / cellSize)
    const startY = Math.floor(agent.sprite.y / cellSize)
    const path = findPath(
      { x: startX, y: startY },
      { x: poi.gridX, y: poi.gridY },
      this.navGrid,
    )

    if (path.length === 0) return  // No valid path, skip

    const state: WanderState = {
      phase: 'walking-to-poi',
      targetPOI: poi,
      deskGridX,
      deskGridY,
      atPoiTimer: null,
    }
    this.states.set(agentId, state)

    // Command agent to walk
    agent.walkToPath(path)
  }

  /**
   * Called by AgentManager.update() each frame to check if agents
   * have arrived at their POI or desk destination.
   */
  update(agents: AgentSprite[]): void {
    for (const agent of agents) {
      const agentId = agent.agentData.agent_id
      const state = this.states.get(agentId)
      if (!state) continue

      if (state.phase === 'walking-to-poi' && agent.currentState === 'idle') {
        // Agent finished walking to POI — arrived
        state.phase = 'at-poi'

        // Show flavor text chat bubble
        if (state.targetPOI) {
          const texts = state.targetPOI.flavorTexts
          const text = texts[Math.floor(Math.random() * texts.length)]
          agent.showChatBubble(text, 5000)
        }

        // Wait 10-20 seconds, then walk back to desk
        const waitTime = 10_000 + Math.random() * 10_000
        state.atPoiTimer = setTimeout(() => {
          this.returnToDesk(agent, state)
        }, waitTime)
      }

      if (state.phase === 'walking-to-desk' && agent.currentState === 'idle') {
        // Agent finished walking back to desk — wander complete
        this.states.delete(agentId)
      }
    }
  }

  /** Command agent to walk back to their desk. */
  private returnToDesk(agent: AgentSprite, state: WanderState): void {
    state.phase = 'walking-to-desk'

    const cellSize = this.navGrid.cellSize
    const startX = Math.floor(agent.sprite.x / cellSize)
    const startY = Math.floor(agent.sprite.y / cellSize)
    const path = findPath(
      { x: startX, y: startY },
      { x: state.deskGridX, y: state.deskGridY },
      this.navGrid,
    )

    if (path.length > 0) {
      agent.walkToPath(path)
    } else {
      // Can't path back — just clear state
      this.states.delete(agent.agentData.agent_id)
    }
  }

  /** Cancel an ongoing wander for the given agent. */
  cancelWander(agentId: string): void {
    const state = this.states.get(agentId)
    if (state) {
      if (state.atPoiTimer) {
        clearTimeout(state.atPoiTimer)
      }
      this.states.delete(agentId)
    }
  }

  /** Cancel all ongoing wanders. */
  cancelAll(): void {
    for (const [, state] of this.states) {
      if (state.atPoiTimer) {
        clearTimeout(state.atPoiTimer)
      }
    }
    this.states.clear()
  }

  /** Pick a random POI from HARDCODED_POIS. */
  private pickRandomPOI(): POI | null {
    if (HARDCODED_POIS.length === 0) return null
    return HARDCODED_POIS[Math.floor(Math.random() * HARDCODED_POIS.length)]
  }

  /** Check if an agent is currently wandering. */
  isWandering(agentId: string): boolean {
    return this.states.has(agentId)
  }
}
