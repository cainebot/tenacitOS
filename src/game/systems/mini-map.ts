import Phaser from 'phaser'
import { STATUS_COLOR } from '../constants'
import type { PlayerSprite } from '../entities/player-sprite'
import type { AgentManager } from './agent-manager'

// ── Layout ──
const MAP_W = 180
const MAP_H = 128 // ~136:97 aspect ratio
const MARGIN = 16
const RADIUS = 8

// ── Dots ──
const DOT_AGENT_R = 3
const DOT_PLAYER_R = 4

// ── Colors ──
const BG = 0x0c111d
const BG_ALPHA = 0.85
const BORDER = 0x333741
const BORDER_ALPHA = 0.6
const VP_COLOR = 0xffffff
const VP_ALPHA = 0.35
const PLAYER_COLOR = 0xffffff

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Mini-map overlay pinned to a screen corner.
 *
 * - Draggable: click & drag to reposition, snaps to nearest corner on release
 * - Zoom-independent: scrollFactor 0, positions in screen-space pixels
 * - Shows agent dots (colored by status), player dot (white),
 *   and a viewport rectangle matching the main camera
 */
export class MiniMap {
  private container: Phaser.GameObjects.Container
  private hitZone: Phaser.GameObjects.Zone
  private dots: Phaser.GameObjects.Graphics
  private vp: Phaser.GameObjects.Graphics
  private worldW: number
  private worldH: number
  private corner: Corner = 'bottom-left'
  private dragging = false
  private dragOffsetX = 0
  private dragOffsetY = 0

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerSprite,
    private agentManager: AgentManager,
    worldWidth: number,
    worldHeight: number,
  ) {
    this.worldW = worldWidth
    this.worldH = worldHeight

    // Container pinned to screen
    this.container = scene.add.container(0, 0)
    this.container.setScrollFactor(0)
    this.container.setDepth(100)

    // Background
    const bg = scene.add.graphics()
    bg.fillStyle(BG, BG_ALPHA)
    bg.fillRoundedRect(0, 0, MAP_W, MAP_H, RADIUS)
    bg.lineStyle(1, BORDER, BORDER_ALPHA)
    bg.strokeRoundedRect(0, 0, MAP_W, MAP_H, RADIUS)
    this.container.add(bg)

    // Dynamic layers
    this.dots = scene.add.graphics()
    this.vp = scene.add.graphics()
    this.container.add([this.dots, this.vp])

    // Invisible hit zone for drag (on top of everything in the container)
    this.hitZone = scene.add.zone(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H)
    this.hitZone.setInteractive({ draggable: true, cursor: 'grab' })
    this.container.add(this.hitZone)

    // ── Drag handlers ──
    this.hitZone.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
      this.dragging = true
      this.dragOffsetX = _pointer.x - this.container.x
      this.dragOffsetY = _pointer.y - this.container.y
    })

    this.hitZone.on('drag', (_pointer: Phaser.Input.Pointer) => {
      const cam = scene.cameras.main
      const nx = Phaser.Math.Clamp(_pointer.x - this.dragOffsetX, 0, cam.width - MAP_W)
      const ny = Phaser.Math.Clamp(_pointer.y - this.dragOffsetY, 0, cam.height - MAP_H)
      this.container.setPosition(nx, ny)
    })

    this.hitZone.on('dragend', () => {
      this.dragging = false
      this.snapToNearestCorner()
    })

    // Enable drag on the scene input plugin
    scene.input.setDraggable(this.hitZone)

    // Snap to initial corner
    this.snapToCorner(this.corner)

    // Reposition on resize (stay in same corner)
    scene.scale.on('resize', () => this.snapToCorner(this.corner))
  }

  private cornerPos(c: Corner): { x: number; y: number } {
    const cam = this.scene.cameras.main
    switch (c) {
      case 'top-left':     return { x: MARGIN, y: MARGIN }
      case 'top-right':    return { x: cam.width - MAP_W - MARGIN, y: MARGIN }
      case 'bottom-left':  return { x: MARGIN, y: cam.height - MAP_H - MARGIN }
      case 'bottom-right': return { x: cam.width - MAP_W - MARGIN, y: cam.height - MAP_H - MARGIN }
    }
  }

  private snapToCorner(c: Corner) {
    const pos = this.cornerPos(c)
    this.corner = c
    this.container.setPosition(pos.x, pos.y)
  }

  private snapToNearestCorner() {
    const cx = this.container.x + MAP_W / 2
    const cy = this.container.y + MAP_H / 2
    const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

    let best: Corner = this.corner
    let bestDist = Infinity

    for (const c of corners) {
      const p = this.cornerPos(c)
      const dx = (p.x + MAP_W / 2) - cx
      const dy = (p.y + MAP_H / 2) - cy
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        best = c
      }
    }

    this.snapToCorner(best)
  }

  private toMini(wx: number, wy: number) {
    return {
      x: (wx / this.worldW) * MAP_W,
      y: (wy / this.worldH) * MAP_H,
    }
  }

  update() {
    // ── Agent dots ──
    this.dots.clear()
    for (const agent of this.agentManager.agents) {
      const p = this.toMini(agent.sprite.x, agent.sprite.y)
      const color = STATUS_COLOR[agent.agentData.status] ?? 0x667085
      this.dots.fillStyle(color, 1)
      this.dots.fillCircle(p.x, p.y, DOT_AGENT_R)
    }

    // Player dot
    const pp = this.toMini(this.player.sprite.x, this.player.sprite.y)
    this.dots.fillStyle(PLAYER_COLOR, 1)
    this.dots.fillCircle(pp.x, pp.y, DOT_PLAYER_R)

    // ── Viewport rectangle ──
    this.vp.clear()
    const cam = this.scene.cameras.main
    const tl = this.toMini(cam.worldView.x, cam.worldView.y)
    const w = (cam.worldView.width / this.worldW) * MAP_W
    const h = (cam.worldView.height / this.worldH) * MAP_H

    this.vp.lineStyle(1.5, VP_COLOR, VP_ALPHA)
    this.vp.strokeRect(tl.x, tl.y, w, h)
  }
}
