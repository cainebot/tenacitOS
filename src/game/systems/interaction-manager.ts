import type { AgentSprite } from '@/game/entities/agent-sprite'
import officeEvents from '@/lib/office-events'
import { INTERACTION_RANGE } from '@/game/constants'

export class InteractionManager {
  private scene: Phaser.Scene
  private range: number
  private nearestAgent: AgentSprite | null = null

  constructor(scene: Phaser.Scene, range: number = INTERACTION_RANGE) {
    this.scene = scene
    this.range = range
  }

  /** Call once after scene.create() */
  setupInput(): void {
    this.scene.input.keyboard!.on('keydown-E', () => {
      if (!this.nearestAgent) return
      const agent = this.nearestAgent.agentData
      officeEvents.emit('agent:select', {
        agent_id: agent.agent_id,
        name: agent.name,
        role: agent.role ?? 'Agent',
        status: agent.status,
      })
    })
  }

  /** Call every frame from OfficeScene.update() */
  update(playerX: number, playerY: number, agents: AgentSprite[]): AgentSprite | null {
    let nearest: AgentSprite | null = null
    let nearestDist = this.range

    for (const agent of agents) {
      const dx = agent.sprite.x - playerX
      const dy = agent.sprite.y - playerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = agent
      }
    }

    // Show/hide interaction hints
    if (nearest !== this.nearestAgent) {
      if (this.nearestAgent) this.nearestAgent.hideInteractionHint()
      if (nearest) nearest.showInteractionHint()
      this.nearestAgent = nearest
    }

    return nearest
  }

  destroy(): void {
    this.nearestAgent = null
  }
}
