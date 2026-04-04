import Phaser from 'phaser'
import { DEMO_AGENTS, SPAWN_POSITIONS, CHAR_SPRITES, type AgentData } from '../constants'
import { AgentSprite } from '../entities/agent-sprite'
import type { AgentSnapshot } from '../state-snapshot'
import { IdleBehavior } from './idle-behavior'
import { NavGrid } from '../pathfinding/nav-grid'
import { findPath } from '../pathfinding/pathfinder'
import type { AgentSpatialState } from '@/features/office/types'

/**
 * Fetches agent data and spawns AgentSprite instances.
 *
 * spawnAgents() is async (fetch). OfficeScene.create() MUST await it
 * to avoid timing bugs where the scene starts before agents exist.
 */
export class AgentManager {
  readonly agents: AgentSprite[] = []
  private idleBehavior: IdleBehavior | null = null
  private navGrid: NavGrid | null = null

  async spawnAgents(scene: Phaser.Scene, tileSize: number): Promise<void> {
    let agents: AgentData[] = []
    try {
      const res = await fetch('/api/agents/list')
      if (res.ok) agents = await res.json()
    } catch { /* fallback */ }
    if (agents.length === 0) agents = DEMO_AGENTS

    const count = Math.min(agents.length, SPAWN_POSITIONS.length, CHAR_SPRITES.length)
    for (let i = 0; i < count; i++) {
      const spawn = SPAWN_POSITIONS[i]
      const px = spawn.tileX * tileSize + tileSize / 2
      const py = spawn.tileY * tileSize + tileSize / 2
      const charKey = CHAR_SPRITES[i].key

      const agent = new AgentSprite(scene, px, py, charKey, spawn.facing, agents[i])
      this.agents.push(agent)
    }
  }

  /** Initialize the navigation grid for A* pathfinding. */
  initNavGrid(mapWidth: number, mapHeight: number, cellSize: number): void {
    this.navGrid = new NavGrid(mapWidth, mapHeight, cellSize)
    this.idleBehavior = new IdleBehavior(this.navGrid)
    // MVP: no blocked cells (no collision layer in Tiled map)
    // Future: this.navGrid.setBlockedCells(blockedCells)
  }

  /**
   * Handle a projection:update event. Resolves A* path and commands the agent.
   * Called by OfficeScene's officeEvents listener.
   */
  updateProjection(agentId: string, state: AgentSpatialState): void {
    const agent = this.agents.find(a => a.agentData.agent_id === agentId)
    if (!agent || !this.navGrid) return

    // Convert current sprite position to grid coordinates
    const cellSize = this.navGrid.cellSize
    const startGridX = Math.floor(agent.sprite.x / cellSize)
    const startGridY = Math.floor(agent.sprite.y / cellSize)
    const goalGridX = state.targetGridPos.x
    const goalGridY = state.targetGridPos.y

    // Stop current movement
    agent.stopMovement()

    // Cancel any ongoing idle wander for this agent
    if (this.idleBehavior) {
      this.idleBehavior.cancelWander(agentId)
    }

    // Set the logical state
    agent.setAgentState(state.animationState)

    // Show emote if specified
    if (state.emote) {
      agent.showEmote(state.emote)
    }

    // Show chat bubble if specified
    if (state.chatBubble) {
      agent.showChatBubble(state.chatBubble)
    }

    // If already at target cell, don't pathfind
    if (startGridX === goalGridX && startGridY === goalGridY) {
      // Already at destination — just update visual state
      return
    }

    // Compute A* path (returns pixel coordinates)
    const path = findPath(
      { x: startGridX, y: startGridY },
      { x: goalGridX, y: goalGridY },
      this.navGrid,
    )

    if (path.length > 0) {
      agent.walkToPath(path)
    }
  }

  /** Serializable agent positions for the state snapshot. */
  toSnapshot(): ReadonlyArray<AgentSnapshot> {
    return this.agents.map(a => ({
      id: a.agentData.agent_id,
      x: a.sprite.x,
      y: a.sprite.y,
      name: a.agentData.name,
      role: a.agentData.role ?? 'Agent',
      status: a.agentData.status,
    }))
  }

  /** Update agent status. Stub for Supabase Realtime integration. */
  updateAgent(agentId: string, newStatus: string): void {
    const agent = this.agents.find(a => a.agentData.agent_id === agentId)
    if (!agent) return
    ;(agent.agentData as { status: string }).status = newStatus
  }

  /** Get the idle behavior system (available after initNavGrid). */
  getIdleBehavior(): IdleBehavior | null {
    return this.idleBehavior
  }

  /** Advance all agent sprites one frame. Called by OfficeScene.update(). */
  update(delta: number): void {
    for (const agent of this.agents) {
      agent.update(delta)
    }
    // Update idle behavior state machine
    if (this.idleBehavior) {
      this.idleBehavior.update(this.agents)
    }
  }
}
