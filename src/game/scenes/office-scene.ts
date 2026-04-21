import Phaser from 'phaser'
import officeEvents from '@/lib/office-events'
import { TILESET } from '../constants'
import { PlayerSprite } from '../entities/player-sprite'
import { AgentManager } from '../systems/agent-manager'
import { BindingOverlayRenderer } from '../systems/binding-overlay-renderer'
import { InteractionManager } from '../systems/interaction-manager'
import { CameraController } from '../systems/camera-controller'
import { ZoneHighlight } from '../systems/zone-highlight'
import { snapshot, notifySubscribers } from '../state-snapshot'
import { drain, type GameCommand } from '../command-queue'
import type { AgentSpatialState } from '@/features/office/types'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { HARDCODED_POIS } from '@/features/office/projection/zone-seed'

// ── Minimap background dimensions ──
const MINIMAP_W = 200
const MINIMAP_H = 142
const DARKEN = 0.45

export class OfficeScene extends Phaser.Scene {
  private player!: PlayerSprite
  private cameraCtrl!: CameraController
  private agentManager!: AgentManager
  private bindingOverlay!: BindingOverlayRenderer
  private interactionMgr!: InteractionManager
  private zoneHighlight!: ZoneHighlight
  private projectionHandler: ((payload: { agentId: string; state: AgentSpatialState }) => void) | null = null
  private bindingsHandler: ((bindings: import('@/features/office/types').ZoneBinding[]) => void) | null = null

  constructor() {
    super({ key: 'OfficeScene' })
  }

  async create() {
    try {
      await this._create()
    } catch (e) {
      console.error('[OfficeScene] create failed:', e)
      snapshot.lifecycle = 'error'
      snapshot.lastError = String(e)
      notifySubscribers()
    }
  }

  private async _create() {
    snapshot.lifecycle = 'loading'

    // ── Read mapDocument from store (may be null if DB has no data) ──
    const mapDocument = useOfficeStore.getState().mapDocument
    const storePois = useOfficeStore.getState().pois

    // ── Tilemap ──
    const map = this.make.tilemap({ key: 'office' })
    const tileset = map.addTilesetImage(TILESET.mapName, TILESET.key)
    if (!tileset) { console.error('[Office] tileset FAILED'); return }

    const groundLayer = map.createLayer('ground', tileset)
    if (!groundLayer) { console.error('[Office] ground layer FAILED'); return }
    groundLayer.setDepth(0)

    const tileSize = map.tileWidth

    // ── Binding overlay (desk labels + anchor dots) ──
    this.bindingOverlay = new BindingOverlayRenderer(this, tileSize)

    // ── Zone highlight (Gather-style white border on enter) ──
    this.zoneHighlight = new ZoneHighlight(this, tileSize)
    if (mapDocument?.zones) {
      this.zoneHighlight.setZones(mapDocument.zones)
    }
    // Debug: log zone count
    console.log('[OfficeScene] Zone highlight initialized, zones:', mapDocument?.zones?.length ?? 0)

    // ── World dimensions ──
    snapshot.world.width = map.widthInPixels
    snapshot.world.height = map.heightInPixels

    // ── Player (use spawn from mapDocument if available) ──
    const playerSpawnPoint = mapDocument?.spawnPoints?.find(sp => sp.forType === 'player')
    const playerSpawn = playerSpawnPoint
      ? { gridX: playerSpawnPoint.gridX, gridY: playerSpawnPoint.gridY, facing: playerSpawnPoint.facing }
      : undefined
    this.player = new PlayerSprite(this, tileSize, playerSpawn)
    this.player.setupInput(this)

    // ── Camera ──
    this.cameraCtrl = new CameraController(this, this.player.sprite, map.widthInPixels, map.heightInPixels)

    // ── Agents (async — awaited to prevent timing bugs) ──
    this.agentManager = new AgentManager()
    await this.agentManager.spawnAgents(this, tileSize, mapDocument?.spawnPoints)

    // ── NavGrid for A* pathfinding (pass POIs from store, fallback to hardcoded) ──
    const pois = storePois.length > 0 ? storePois : HARDCODED_POIS
    const blockedCells = mapDocument?.navGrid?.blocked ?? []
    this.agentManager.initNavGrid(map.width, map.height, tileSize, pois, blockedCells)

    // Share NavGrid with player for collision
    const navGrid = this.agentManager.getNavGrid()
    if (navGrid) this.player.setNavGrid(navGrid)

    // ── Block agentRestricted zone cells in NavGrid (PROJ-02, v1 global blocking) ──
    if (navGrid && mapDocument?.zones) {
      const restrictedCells: Array<{ x: number; y: number }> = []
      for (const zone of mapDocument.zones) {
        if (zone.agentRestricted && zone.gridCells?.length) {
          restrictedCells.push(...zone.gridCells)
        }
      }
      if (restrictedCells.length > 0) {
        navGrid.setBlockedCells(restrictedCells)
        console.log(`[OfficeScene] Blocked ${restrictedCells.length} cells from ${mapDocument.zones.filter(z => z.agentRestricted).length} restricted zone(s)`)
      }
    }

    // ── Listen for projection:update events from React ──
    this.projectionHandler = ({ agentId, state }) => {
      this.agentManager.updateProjection(agentId, state)
      // Update snapshot agents (position may change)
      snapshot.agents = this.agentManager.toSnapshot()
    }
    officeEvents.on('projection:update', this.projectionHandler)

    // ── Listen for bindings:update events from React ──
    this.bindingsHandler = (bindings) => {
      this.bindingOverlay.update(bindings)
    }
    officeEvents.on('bindings:update', this.bindingsHandler)

    // ── Populate snapshot agents (once — they are static) ──
    snapshot.agents = this.agentManager.toSnapshot()

    // ── Generate minimap background (async, one-time) ──
    await this.generateMinimapBg(groundLayer)

    // ── Interaction manager (proximity scan + E-key) ──
    this.interactionMgr = new InteractionManager(this)
    this.interactionMgr.setupInput()

    // ── Cleanup on scene shutdown ──
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      delete (globalThis as any).__circos_viewer_cam
      if (this.projectionHandler) {
        officeEvents.off('projection:update', this.projectionHandler)
        this.projectionHandler = null
      }
      if (this.bindingsHandler) {
        officeEvents.off('bindings:update', this.bindingsHandler)
        this.bindingsHandler = null
      }
      this.bindingOverlay.destroy()
      this.zoneHighlight.destroy()
      this.interactionMgr.destroy()
      // Cleanup idle behavior timers
      const idleBehavior = this.agentManager.getIdleBehavior()
      if (idleBehavior) {
        idleBehavior.cancelAll()
      }
    })

    // Expose camera ref for React HTML overlays (zone badge)
    ;(globalThis as any).__circos_viewer_cam = this.cameras.main

    // ── Ready ──
    snapshot.lifecycle = 'ready'
    notifySubscribers()
  }

  update(_time: number, delta: number) {
    if (!this.player || !this.agentManager || !this.interactionMgr || !this.zoneHighlight) return

    // ── A. Drain command queue ──
    const commands = drain()
    for (const cmd of commands) {
      this.handleCommand(cmd)
    }

    // ── B. Game logic ──
    this.player.update(delta)
    this.agentManager.update(delta)  // advance agent walks + idle behavior

    // ── Zone presence detection ──
    const currentZoneId = this.zoneHighlight.update(
      this.player.sprite.x,
      this.player.sprite.y,
    )

    const nearest = this.interactionMgr.update(
      this.player.sprite.x,
      this.player.sprite.y,
      this.agentManager.agents,
    )

    // ── C. Write snapshot ──
    const cam = this.cameras.main
    snapshot.frame++
    snapshot.updatedAt = performance.now()
    snapshot.player.x = this.player.sprite.x
    snapshot.player.y = this.player.sprite.y
    snapshot.player.facing = this.player.currentFacing
    snapshot.player.moving = this.player.isMoving
    snapshot.player.zoneId = currentZoneId
    snapshot.camera.x = cam.worldView.x
    snapshot.camera.y = cam.worldView.y
    snapshot.camera.w = cam.worldView.width
    snapshot.camera.h = cam.worldView.height
    snapshot.camera.zoom = cam.zoom
    snapshot.nearbyAgentId = nearest?.agentData.agent_id ?? null
    notifySubscribers()
  }

  // ── Command handler ──

  private handleCommand(cmd: GameCommand): void {
    switch (cmd.type) {
      case 'teleport':
        this.player.sprite.setPosition(cmd.x, cmd.y)
        break
      case 'focusAgent': {
        const agent = this.agentManager.agents.find(a => a.agentData.agent_id === cmd.agentId)
        if (agent) this.cameras.main.pan(agent.sprite.x, agent.sprite.y, 500, 'Sine.easeInOut')
        break
      }
      case 'setZoom':
        this.cameras.main.zoomTo(cmd.zoom, 300)
        break
      case 'updateAgent':
        this.agentManager.updateAgent(cmd.agentId, cmd.status)
        snapshot.agents = this.agentManager.toSnapshot()
        break
    }
  }

  // ── Minimap background generation ──
  // Same pixel-sampling algorithm as the old React buildMinimapBg,
  // but executed here where we have first-party access to tileset textures.

  private async generateMinimapBg(
    groundLayer: Phaser.Tilemaps.TilemapLayer,
  ): Promise<void> {
    const ts = groundLayer.tileset[0]
    if (!ts) return

    const tileW: number = ts.tileWidth
    const tileH: number = ts.tileHeight
    const firstGid: number = ts.firstgid

    // Get tileset source image
    let sourceImg: HTMLImageElement | HTMLCanvasElement
    try {
      const texKey = (ts.image as { key?: string })?.key ?? String(ts.image)
      sourceImg = this.textures.get(texKey).getSourceImage() as HTMLImageElement
    } catch {
      return
    }

    // Draw tileset to offscreen canvas for pixel access
    const tsCanvas = document.createElement('canvas')
    tsCanvas.width = (sourceImg as HTMLImageElement).naturalWidth || sourceImg.width
    tsCanvas.height = (sourceImg as HTMLImageElement).naturalHeight || sourceImg.height
    const tsCtx = tsCanvas.getContext('2d')!
    tsCtx.drawImage(sourceImg, 0, 0)

    const tsCols = Math.floor(tsCanvas.width / tileW)

    // Cache: localIndex → darkened average color
    const colorCache: Record<number, string> = {}

    function avgColor(localIndex: number): string {
      if (colorCache[localIndex] !== undefined) return colorCache[localIndex]

      const col = localIndex % tsCols
      const row = Math.floor(localIndex / tsCols)
      const sx = col * tileW
      const sy = row * tileH

      if (sx + tileW > tsCanvas.width || sy + tileH > tsCanvas.height) {
        colorCache[localIndex] = 'rgb(15,17,23)'
        return colorCache[localIndex]
      }

      const data = tsCtx.getImageData(sx, sy, tileW, tileH).data
      let r = 0, g = 0, b = 0, count = 0
      const step = 8
      for (let y = 0; y < tileH; y += step) {
        for (let x = 0; x < tileW; x += step) {
          const i = (y * tileW + x) * 4
          if (data[i + 3] > 128) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]
            count++
          }
        }
      }

      if (count === 0) {
        colorCache[localIndex] = 'rgb(15,17,23)'
      } else {
        colorCache[localIndex] = `rgb(${Math.round((r / count) * DARKEN)},${Math.round((g / count) * DARKEN)},${Math.round((b / count) * DARKEN)})`
      }
      return colorCache[localIndex]
    }

    // Build the minimap background canvas at HiDPI resolution
    const worldW = snapshot.world.width
    const worldH = snapshot.world.height
    const dpr = window.devicePixelRatio || 1
    const canvas = document.createElement('canvas')
    canvas.width = MINIMAP_W * dpr
    canvas.height = MINIMAP_H * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const scaleX = MINIMAP_W / worldW
    const scaleY = MINIMAP_H / worldH

    const layer = groundLayer.layer
    for (let ty = 0; ty < layer.height; ty++) {
      for (let tx = 0; tx < layer.width; tx++) {
        const tile = layer.data[ty][tx]
        if (tile.index < 0) continue

        const localIndex = tile.index - firstGid
        ctx.fillStyle = avgColor(localIndex)
        ctx.fillRect(
          tile.pixelX * scaleX,
          tile.pixelY * scaleY,
          tileW * scaleX + 0.5,
          tileH * scaleY + 0.5,
        )
      }
    }

    try {
      snapshot.minimapBg = await createImageBitmap(canvas)
    } catch {
      // Fallback: store the canvas directly (older browsers)
      snapshot.minimapBg = null
    }
  }
}
