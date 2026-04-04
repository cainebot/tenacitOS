import Phaser from 'phaser'
import officeEvents from '@/lib/office-events'
import { IDLE_ROW, COLS, DIR_INDEX, FRAMES_PER_DIR, SPRITE_SCALE, STATUS_COLOR, type AgentData } from '../constants'
import { createCharAnims, createTooltip, updateTooltipText, type TooltipResult } from '../utils/sprite-factory'

/**
 * A single agent character in the office.
 *
 * Lifecycle: pointerdown listener is on the sprite — Phaser destroys it
 * automatically with the GameObject when the scene shuts down.
 */
export class AgentSprite {
  readonly sprite: Phaser.GameObjects.Sprite
  readonly tooltip: TooltipResult
  readonly agentData: AgentData
  private readonly agentName: string
  private readonly dotColor: number
  private _hintVisible = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    charKey: string,
    facing: string,
    agent: AgentData,
  ) {
    this.agentData = agent
    this.agentName = agent.name
    this.dotColor = STATUS_COLOR[agent.status] ?? 0x667085

    const standingFrame = IDLE_ROW * COLS + (DIR_INDEX[facing] ?? 3) * FRAMES_PER_DIR

    createCharAnims(scene, charKey)

    // Sprite
    this.sprite = scene.add.sprite(x, y, charKey, standingFrame)
    this.sprite.setOrigin(0.5, 1)
    this.sprite.setScale(SPRITE_SCALE)
    this.sprite.setDepth(10)
    this.sprite.play(`${charKey}_idle_${facing}`)

    // Click → emit agent:select
    this.sprite.setInteractive({ cursor: 'pointer' })
    this.sprite.on('pointerdown', () => {
      officeEvents.emit('agent:select', {
        agent_id: agent.agent_id,
        name: agent.name,
        role: agent.role ?? 'Agent',
        status: agent.status,
      })
    })

    // UUI tooltip above sprite
    const labelY = y - (72 * SPRITE_SCALE) - 8
    this.tooltip = createTooltip(scene, x, labelY, agent.name, this.dotColor)
  }

  showInteractionHint(): void {
    if (this._hintVisible) return
    this._hintVisible = true
    updateTooltipText(this.tooltip, `${this.agentName} [Press E]`, this.dotColor)
    this.sprite.postFX.addGlow(0x444CE7, 2, 0, false, 0.3, 8)
  }

  hideInteractionHint(): void {
    if (!this._hintVisible) return
    this._hintVisible = false
    updateTooltipText(this.tooltip, this.agentName, this.dotColor)
    this.sprite.postFX.clear()
  }
}
