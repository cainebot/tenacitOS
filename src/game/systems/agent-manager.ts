import Phaser from 'phaser'
import { DEMO_AGENTS, SPAWN_POSITIONS, CHAR_SPRITES, type AgentData } from '../constants'
import { AgentSprite } from '../entities/agent-sprite'
import type { AgentSnapshot } from '../state-snapshot'
import { IdleBehavior } from './idle-behavior'

/**
 * Fetches agent data and spawns AgentSprite instances.
 *
 * spawnAgents() is async (fetch). OfficeScene.create() MUST await it
 * to avoid timing bugs where the scene starts before agents exist.
 */
export class AgentManager {
  readonly agents: AgentSprite[] = []
  private idleBehavior: IdleBehavior | null = null

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
