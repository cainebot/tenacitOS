import Phaser from 'phaser'
import { TILESET } from '../constants'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { TildeGrid } from '../systems/tilde-grid'
import { BuilderInputHandler } from '../systems/builder-input-handler'

export class BuilderScene extends Phaser.Scene {
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private tildeGrid!: TildeGrid
  private inputHandler!: BuilderInputHandler

  constructor() {
    super({ key: 'BuilderScene' })
  }

  async create() {
    try {
      await this._create()
    } catch (e) {
      console.error('[BuilderScene] create failed:', e)
    }
  }

  private async _create() {
    // ── Tilemap ──
    const map = this.make.tilemap({ key: 'office' })
    const tileset = map.addTilesetImage(TILESET.mapName, TILESET.key)
    if (!tileset) {
      console.error('[BuilderScene] tileset FAILED')
      return
    }

    const groundLayer = map.createLayer('ground', tileset)
    if (!groundLayer) {
      console.error('[BuilderScene] ground layer FAILED')
      return
    }
    groundLayer.setDepth(0)

    // ── Camera: bounds, zoom, NO player follow ──
    const cam = this.cameras.main
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    cam.setZoom(1.5)
    cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)

    // ── Pointer drag panning (Hand tool only) ──
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 0 && useBuilderStore.getState().activeTool === 'hand') {
        this.isDragging = true
        this.dragStart = { x: ptr.worldX, y: ptr.worldY }
      }
    })

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isDragging && ptr.isDown) {
        cam.scrollX -= ptr.worldX - this.dragStart.x
        cam.scrollY -= ptr.worldY - this.dragStart.y
      }
    })

    this.input.on('pointerup', () => {
      this.isDragging = false
    })

    // ── Mouse wheel zoom (0.5x to 4x range) ──
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.002, 0.5, 4)
        // Zoom change dirties the tilde grid
        this.tildeGrid?.['dirty'] // access is handled via camera events
      },
    )

    // ── TildeGrid overlay ──
    this.tildeGrid = new TildeGrid(this, map.width, map.height, map.tileWidth)

    // ── Input handler for zone painting ──
    this.inputHandler = new BuilderInputHandler(
      this,
      this.tildeGrid,
      map.tileWidth,
      map.width,
      map.height,
    )
    this.inputHandler.setup()

    // Load existing zone data from builder store into TildeGrid
    const { zones } = useBuilderStore.getState()
    this.tildeGrid.loadFromZones(zones)

    // Load blocked cells from navGrid (if available)
    const mapDoc = useOfficeStore.getState().mapDocument
    if (mapDoc?.navGrid?.blocked) {
      this.tildeGrid.loadBlockedCells(mapDoc.navGrid.blocked)
    }
  }

  update() {
    const { zones } = useBuilderStore.getState()
    this.tildeGrid?.update(zones)
  }
}
