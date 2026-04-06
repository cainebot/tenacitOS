import Phaser from 'phaser'
import { TILESET } from '../constants'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { TildeGrid } from '../systems/tilde-grid'
import { BuilderInputHandler } from '../systems/builder-input-handler'
import { isTempHandActive, setTempHand } from '../systems/builder-flags'

export class BuilderScene extends Phaser.Scene {
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private tildeGrid!: TildeGrid
  private inputHandler!: BuilderInputHandler
  /** Temporary hand mode via Space or middle-click */
  private get tempHand() { return isTempHandActive }
  private set tempHand(v: boolean) { setTempHand(v) }

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

    // ── Camera: zoom 42/64 so 64px tiles appear at 42px visual ──
    const PAD = 500 // world-space padding around map edges
    const cam = this.cameras.main
    cam.setBounds(-PAD, -PAD, map.widthInPixels + PAD * 2, map.heightInPixels + PAD * 2)
    cam.setZoom(42 / 64) // 0.65625 — both tilemap and grid scale equally
    cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)

    // ── Cursor helper (Phaser-native default cursor) ──
    const setCursor = (cursor: string) => {
      this.input.setDefaultCursor(cursor)
    }

    const isHandActive = () =>
      this.tempHand || useBuilderStore.getState().activeTool === 'hand'

    // ── Pointer drag panning (Hand tool OR tempHand via Space/middle-click) ──
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // Middle-click activates temporary hand
      if (ptr.button === 1) {
        this.tempHand = true
        this.isDragging = true
        this.dragStart = { x: ptr.worldX, y: ptr.worldY }
        setCursor('grabbing')
        return
      }

      if (ptr.button === 0 && isHandActive()) {
        this.isDragging = true
        this.dragStart = { x: ptr.worldX, y: ptr.worldY }
        setCursor('grabbing')
      }
    })

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isDragging && ptr.isDown) {
        cam.scrollX -= ptr.worldX - this.dragStart.x
        cam.scrollY -= ptr.worldY - this.dragStart.y
      }
    })

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      this.isDragging = false

      // Release middle-click temporary hand
      if (ptr.button === 1) {
        this.tempHand = false
        // Restore cursor based on real active tool
        setCursor(useBuilderStore.getState().activeTool === 'hand' ? 'grab' : 'crosshair')
        return
      }

      if (isHandActive()) {
        setCursor('grab')
      }
    })

    // ── Space key: temporary hand mode (skip when typing in HTML inputs) ──
    this.input.keyboard?.on('keydown-SPACE', (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      if (this.tempHand) return // already in temp hand
      this.tempHand = true
      setCursor('grab')
    })

    this.input.keyboard?.on('keyup-SPACE', () => {
      this.tempHand = false
      this.isDragging = false
      // Restore cursor based on real active tool
      setCursor(useBuilderStore.getState().activeTool === 'hand' ? 'grab' : 'crosshair')
    })

    // ── Set initial cursor based on active tool ──
    setCursor(useBuilderStore.getState().activeTool === 'hand' ? 'grab' : 'crosshair')

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

    // Expose TildeGrid to React layer for save/publish serialization
    ;(globalThis as any).__circos_builder_grid = this.tildeGrid

    // ── React tool-change cursor sync + grid re-render on tool switch ──
    this._unsubToolChange = useBuilderStore.subscribe((state, prev) => {
      if (state.activeTool !== prev.activeTool) {
        // Tool changed: force grid re-render (visibility depends on active tool)
        this.tildeGrid?.markDirty()
        if (!this.tempHand) {
          setCursor(state.activeTool === 'hand' ? 'grab' : 'crosshair')
        }
      }
    })
  }

  private _unsubToolChange?: () => void

  shutdown() {
    this._unsubToolChange?.()
    delete (globalThis as any).__circos_builder_grid
    delete (globalThis as any).__circos_builder_cam
  }

  update() {
    this.inputHandler?.update()
    const { zones, activeTool } = useBuilderStore.getState()
    this.tildeGrid?.update(zones, activeTool)

    // Expose camera state for React HTML overlays (zone label badges)
    const cam = this.cameras.main
    ;(globalThis as any).__circos_builder_cam = {
      worldViewX: cam.worldView.x,
      worldViewY: cam.worldView.y,
      zoom: cam.zoom,
    }
  }
}
