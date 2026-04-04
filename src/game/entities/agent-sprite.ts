import Phaser from 'phaser'
import officeEvents from '@/lib/office-events'
import { IDLE_ROW, COLS, DIR_INDEX, FRAMES_PER_DIR, SPRITE_SCALE, PLAYER_SPEED, STATUS_COLOR, type AgentData } from '../constants'
import { createCharAnims, createTooltip, updateTooltipText, type TooltipResult } from '../utils/sprite-factory'
import { ChatBubble } from './chat-bubble'
import { EmoteDisplay } from './emote-display'

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

  // Movement state
  private _path: Array<{ x: number; y: number }> = []
  private _pathIndex = 0
  private _currentState: 'idle' | 'walking' | 'working' | 'thinking' | 'error' | 'emote' = 'idle'
  private _chatBubble: ChatBubble | null = null
  private _emoteDisplay: EmoteDisplay | null = null
  private _charKey: string
  private _facing: string
  private _scene: Phaser.Scene

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

    // Store for movement methods
    this._charKey = charKey
    this._facing = facing
    this._scene = scene
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

  /** Walk along a pre-computed A* path (pixel coordinates). */
  walkToPath(path: Array<{ x: number; y: number }>): void {
    if (path.length === 0) return
    this._path = path
    this._pathIndex = 0
    this._currentState = 'walking'
  }

  /** Called by AgentManager each frame. Advances along path. */
  update(delta: number): void {
    // Y-sort depth (matches PlayerSprite exactly)
    this.sprite.setDepth(10 + this.sprite.y * 0.001)

    // Update chat bubble position
    if (this._chatBubble && !this._chatBubble.isDestroyed) {
      this._chatBubble.updatePosition(
        this.sprite.x,
        this.sprite.y - (72 * SPRITE_SCALE) - 8 - 30
      )
    }

    // Update emote position
    if (this._emoteDisplay && !this._emoteDisplay.isDestroyed) {
      this._emoteDisplay.updatePosition(
        this.sprite.x,
        this.sprite.y - (72 * SPRITE_SCALE) - 8
      )
    }

    // Update tooltip position (same formula as PlayerSprite.updateLabel)
    this.tooltip.container.setPosition(
      this.sprite.x - this.tooltip.width / 2,
      this.sprite.y - (72 * SPRITE_SCALE) - 8 - this.tooltip.height - 5,
    )

    if (this._currentState !== 'walking' || this._path.length === 0) return

    const target = this._path[this._pathIndex]
    const dx = target.x - this.sprite.x
    const dy = target.y - this.sprite.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const speed = PLAYER_SPEED * (delta / 1000)

    if (dist <= speed) {
      // Arrived at waypoint
      this.sprite.setPosition(target.x, target.y)
      this._pathIndex++

      if (this._pathIndex >= this._path.length) {
        // Path complete
        this._path = []
        this._pathIndex = 0
        this._currentState = 'idle'
        const idleKey = `${this._charKey}_idle_${this._facing}`
        if (this.sprite.anims.currentAnim?.key !== idleKey) {
          this.sprite.play(idleKey)
        }
        return
      }
    } else {
      // Move toward target
      const nx = dx / dist
      const ny = dy / dist
      this.sprite.x += nx * speed
      this.sprite.y += ny * speed

      // Update facing (horizontal priority on diagonals, matches PlayerSprite)
      let newFacing = this._facing
      if (Math.abs(dx) > Math.abs(dy)) {
        newFacing = dx < 0 ? 'left' : 'right'
      } else {
        newFacing = dy < 0 ? 'up' : 'down'
      }

      const walkKey = `${this._charKey}_walk_${newFacing}`
      if (this.sprite.anims.currentAnim?.key !== walkKey) {
        this._facing = newFacing
        this.sprite.play(walkKey)
      }
    }
  }

  /** Show a speech bubble above the agent. Dismisses previous bubble. */
  showChatBubble(text: string, duration = 5000): void {
    if (this._chatBubble && !this._chatBubble.isDestroyed) {
      this._chatBubble.dismiss()
    }
    this._chatBubble = new ChatBubble(
      this._scene,
      this.sprite.x,
      this.sprite.y - (72 * SPRITE_SCALE) - 8 - 30,
      text,
      duration,
    )
  }

  /** Show an emote icon above the agent. Dismisses previous emote. */
  showEmote(emoteName: string, duration = 3000): void {
    if (this._emoteDisplay && !this._emoteDisplay.isDestroyed) {
      this._emoteDisplay.dismiss()
    }
    this._emoteDisplay = new EmoteDisplay(
      this._scene,
      this.sprite.x,
      this.sprite.y - (72 * SPRITE_SCALE) - 8,
      emoteName,
      duration,
    )
  }

  /** Stop all movement immediately, return to idle. */
  stopMovement(): void {
    this._path = []
    this._pathIndex = 0
    this._currentState = 'idle'
    const idleKey = `${this._charKey}_idle_${this._facing}`
    if (this.sprite.anims.currentAnim?.key !== idleKey) {
      this.sprite.play(idleKey)
    }
  }

  /** Get current movement state. */
  get currentState(): string {
    return this._currentState
  }

  /** Set current logical state (for projection tracking). */
  setAgentState(state: 'idle' | 'walking' | 'working' | 'thinking' | 'error' | 'emote'): void {
    this._currentState = state
  }
}
