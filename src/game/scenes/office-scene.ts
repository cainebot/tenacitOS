import Phaser from 'phaser'
import officeEvents from '@/lib/office-events'
import { TILESET, PLAYER_SPRITE, CHAR_SPRITES, INTERACTION_RANGE } from '../constants'
import { PlayerSprite } from '../entities/player-sprite'
import { AgentSprite } from '../entities/agent-sprite'
import { AgentManager } from '../systems/agent-manager'
import { CameraController } from '../systems/camera-controller'

export class OfficeScene extends Phaser.Scene {
  private player!: PlayerSprite
  private cameraCtrl!: CameraController
  private agentManager!: AgentManager
  private nearbyAgent: AgentSprite | null = null

  constructor() {
    super({ key: 'OfficeScene' })
  }

  preload() {
    this.load.tilemapTiledJSON('office', '/assets/maps/office-v3.json')
    this.load.image(TILESET.key, TILESET.path)
    this.load.spritesheet(PLAYER_SPRITE.key, PLAYER_SPRITE.path, { frameWidth: 48, frameHeight: 96 })
    for (const c of CHAR_SPRITES) {
      this.load.spritesheet(c.key, c.path, { frameWidth: 48, frameHeight: 96 })
    }
  }

  async create() {
    try {
      await this._create()
    } catch (e) {
      console.error('[OfficeScene] create failed:', e)
    }
  }

  private async _create() {
    // ── Tilemap ──
    const map = this.make.tilemap({ key: 'office' })
    const tileset = map.addTilesetImage(TILESET.mapName, TILESET.key)
    if (!tileset) { console.error('[Office] tileset FAILED'); return }

    const groundLayer = map.createLayer('ground', tileset)
    if (!groundLayer) { console.error('[Office] ground layer FAILED'); return }
    groundLayer.setDepth(0)

    const tileSize = map.tileWidth

    // ── Player ──
    this.player = new PlayerSprite(this, tileSize)
    this.player.setupInput(this)

    // ── Camera ──
    this.cameraCtrl = new CameraController(this, this.player.sprite, map.widthInPixels, map.heightInPixels)

    // ── Agents (async — awaited to prevent timing bugs) ──
    this.agentManager = new AgentManager()
    await this.agentManager.spawnAgents(this, tileSize)

    // ── E-key → interact with nearest agent ──
    this.input.keyboard!.on('keydown-E', () => {
      if (!this.nearbyAgent) return
      const agent = this.nearbyAgent.agentData
      officeEvents.emit('agent:select', {
        agent_id: agent.agent_id,
        name: agent.name,
        role: agent.role ?? 'Agent',
        status: agent.status,
      })
    })
  }

  update(_time: number, delta: number) {
    if (!this.player) return
    this.player.update(delta)

    // ── Proximity check — show "Press E" on nearest agent ──
    if (!this.agentManager) return
    const px = this.player.sprite.x
    const py = this.player.sprite.y
    let nearest: AgentSprite | null = null
    let nearestDist = INTERACTION_RANGE

    for (const agent of this.agentManager.agents) {
      const dx = agent.sprite.x - px
      const dy = agent.sprite.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = agent
      }
    }

    for (const agent of this.agentManager.agents) {
      if (agent === nearest) {
        agent.showInteractionHint()
      } else {
        agent.hideInteractionHint()
      }
    }

    this.nearbyAgent = nearest
  }
}
