import Phaser from 'phaser'
import { DEMO_AGENTS, SPAWN_POSITIONS, CHAR_SPRITES, type AgentData } from '../constants'
import { AgentSprite } from '../entities/agent-sprite'

/**
 * Fetches agent data and spawns AgentSprite instances.
 *
 * spawnAgents() is async (fetch). OfficeScene.create() MUST await it
 * to avoid timing bugs where the scene starts before agents exist.
 */
export class AgentManager {
  readonly agents: AgentSprite[] = []

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
}
