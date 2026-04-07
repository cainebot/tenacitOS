import type { AgentSprite } from '@/game/entities/agent-sprite'
import officeEvents from '@/lib/office-events'
import { INTERACTION_RANGE, DESELECT_RANGE } from '@/game/constants'

export class InteractionManager {
  private scene: Phaser.Scene
  private range: number
  private deselectRange: number
  private nearestAgent: AgentSprite | null = null
  private selectedAgentId: string | null = null

  constructor(scene: Phaser.Scene, range: number = INTERACTION_RANGE) {
    this.scene = scene
    this.range = range
    this.deselectRange = DESELECT_RANGE
  }

  /** Call once after scene.create() */
  setupInput(): void {
    this.scene.input.keyboard!.on('keydown-E', () => {
      // Skip when a text input is focused (chat, search, etc.)
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return
      if (!this.nearestAgent) return
      const agent = this.nearestAgent.agentData
      this.selectedAgentId = agent.agent_id
      officeEvents.emit('agent:select', {
        agent_id: agent.agent_id,
        name: agent.name,
        role: agent.role ?? 'Agent',
        status: agent.status,
      })
    })

    // Track panel close from React side
    officeEvents.on('agent:deselect', () => {
      this.selectedAgentId = null
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

    // Auto-deselect when player walks away from the selected agent
    if (this.selectedAgentId) {
      const selected = agents.find(a => a.agentData.agent_id === this.selectedAgentId)
      if (selected) {
        const dx = selected.sprite.x - playerX
        const dy = selected.sprite.y - playerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > this.deselectRange) {
          this.selectedAgentId = null
          officeEvents.emit('agent:deselect')
        }
      }
    }

    return nearest
  }

  destroy(): void {
    this.nearestAgent = null
    this.selectedAgentId = null
  }
}
