import Phaser from 'phaser'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { commandHistory, type PaintCommand } from '@/features/office/builder/stores/command-history'
import { isTempHandActive } from './builder-flags'
import type { TildeGrid, TildeCell } from './tilde-grid'

/** Edge panning: how close to viewport edge (in screen px) to trigger scroll */
const EDGE_MARGIN = 60
/** Edge panning: pixels per frame to scroll the camera */
const EDGE_SCROLL_SPEED = 8

export class BuilderInputHandler {
  private scene: Phaser.Scene
  private tildeGrid: TildeGrid
  private tileSize: number
  private cols: number
  private rows: number
  private isDragging = false
  private dragBatch: Array<{ row: number; col: number; prev: TildeCell; next: TildeCell }> = []
  private lastPaintedCell: { row: number; col: number } | null = null
  private dragStartCell: { row: number; col: number } | null = null
  private isRectMode = false

  constructor(scene: Phaser.Scene, tildeGrid: TildeGrid, tileSize: number, cols: number, rows: number) {
    this.scene = scene
    this.tildeGrid = tildeGrid
    this.tileSize = tileSize
    this.cols = cols
    this.rows = rows
  }

  setup(): void {
    this.scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // Only handle left button
      if (ptr.button !== 0) return

      const { activeTool, selectedZoneId } = useBuilderStore.getState()

      // Hand tool or temporary hand (Space/middle-click): panning handled by BuilderScene
      if (activeTool === 'hand' || isTempHandActive) return

      // Zone-requiring tools: block painting if no zone is selected
      if ((activeTool === 'add-zones' || activeTool === 'seat') && !selectedZoneId) return

      this.isDragging = true
      this.dragBatch = []
      this.lastPaintedCell = null
      this.isRectMode = ptr.event.shiftKey

      const cell = this.pixelToCell(ptr)
      this.dragStartCell = cell ? { row: cell.row, col: cell.col } : null

      // In rect mode, don't paint the first cell — wait for pointerup
      if (!this.isRectMode && cell) {
        this.processCell(cell.row, cell.col)
      }
    })

    this.scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const cell = this.pixelToCell(ptr)

      if (this.isDragging && ptr.isDown) {
        if (this.isRectMode && this.dragStartCell && cell) {
          // Shift held: show rectangle preview, don't paint individual cells
          this.tildeGrid.setHoverRect(this.dragStartCell.row, this.dragStartCell.col, cell.row, cell.col)
        } else if (cell) {
          // Normal drag: paint cell by cell
          this.processCell(cell.row, cell.col)
        }
      } else {
        // Update hover state
        if (cell) {
          this.tildeGrid.setHoverCell(cell.row, cell.col)
        } else {
          this.tildeGrid.clearHover()
        }
      }
    })

    this.scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      // Rect mode: fill the entire rectangle on release
      if (this.isRectMode && this.dragStartCell) {
        const endCell = this.pixelToCell(ptr)
        if (endCell) {
          const minRow = Math.min(this.dragStartCell.row, endCell.row)
          const maxRow = Math.max(this.dragStartCell.row, endCell.row)
          const minCol = Math.min(this.dragStartCell.col, endCell.col)
          const maxCol = Math.max(this.dragStartCell.col, endCell.col)

          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              this.processCell(r, c)
            }
          }
        }
        this.tildeGrid.clearHoverRect()
      }

      this.isDragging = false

      // Commit drag batch as a single undo-able command
      if (this.dragBatch.length > 0) {
        const batch = [...this.dragBatch]
        const grid = this.tildeGrid
        const command: PaintCommand = {
          execute: () => batch.forEach(b => grid.setCellState(b.row, b.col, b.next.state, b.next.zoneId, b.next.seatId)),
          undo: () => batch.forEach(b => grid.setCellState(b.row, b.col, b.prev.state, b.prev.zoneId, b.prev.seatId)),
        }
        // Use pushExecuted because cells are ALREADY painted during the drag.
        // execute() is only used on REDO (replay). undo() reverts all batch cells.
        commandHistory.pushExecuted(command)
      }
      this.dragBatch = []
      this.lastPaintedCell = null
      this.dragStartCell = null
      this.isRectMode = false
    })

    // Clear hover when pointer leaves canvas
    this.scene.input.on('pointerout', () => {
      this.tildeGrid.clearHover()
    })
  }

  private pixelToCell(ptr: Phaser.Input.Pointer): { row: number; col: number } | null {
    const col = Math.floor(ptr.worldX / this.tileSize)
    const row = Math.floor(ptr.worldY / this.tileSize)

    // Guard: out of grid bounds
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null

    return { row, col }
  }

  /** Called every frame from BuilderScene.update() — handles edge panning during drag */
  update(): void {
    if (!this.isDragging) return

    const pointer = this.scene.input.activePointer
    if (!pointer.isDown) return

    const cam = this.scene.cameras.main
    const sx = pointer.x  // screen-space x
    const sy = pointer.y  // screen-space y
    const w = cam.width
    const h = cam.height

    let dx = 0
    let dy = 0

    if (sx < EDGE_MARGIN) dx = -EDGE_SCROLL_SPEED
    else if (sx > w - EDGE_MARGIN) dx = EDGE_SCROLL_SPEED

    if (sy < EDGE_MARGIN) dy = -EDGE_SCROLL_SPEED
    else if (sy > h - EDGE_MARGIN) dy = EDGE_SCROLL_SPEED

    if (dx === 0 && dy === 0) return

    // Scroll camera
    cam.scrollX += dx / cam.zoom
    cam.scrollY += dy / cam.zoom

    // Update rect preview to follow the new world position under the pointer
    if (this.isRectMode && this.dragStartCell) {
      const cell = this.pixelToCell(pointer)
      if (cell) {
        this.tildeGrid.setHoverRect(this.dragStartCell.row, this.dragStartCell.col, cell.row, cell.col)
      }
    }
  }

  private processCell(row: number, col: number): void {
    // Skip if same cell as last painted (prevents redundant operations during slow drags)
    if (this.lastPaintedCell?.row === row && this.lastPaintedCell?.col === col) return
    this.lastPaintedCell = { row, col }

    const { activeTool, selectedZoneId } = useBuilderStore.getState()

    // Clone previous state for undo
    const prevCell = this.tildeGrid.getCellState(row, col)
    if (!prevCell) return
    const prev: TildeCell = { ...prevCell }

    let next: TildeCell | null = null

    if (activeTool === 'add-zones') {
      // No zone selected — modal already shown on tool switch; skip per-click
      if (!selectedZoneId) return

      // All non-default states get replaced with room for this zone
      next = { state: 'room', zoneId: selectedZoneId, seatId: null }

    } else if (activeTool === 'eraser') {
      if (prev.state === 'default') return  // no-op

      // Erase room, blocked, or seat cells back to default
      if (prev.state === 'room' || prev.state === 'blocked' || prev.state === 'seat') {
        next = { state: 'default', zoneId: null, seatId: null }
      }

    } else if (activeTool === 'blocked') {
      // Blocked tool: paint any cell (except already blocked) as blocked
      if (prev.state === 'blocked') return  // no-op — already blocked

      // default, room, seat -> blocked (remove zone and seat data)
      next = { state: 'blocked', zoneId: null, seatId: null }

    } else if (activeTool === 'seat') {
      // Seat tool: can only place seats on Room cells
      if (!selectedZoneId) return  // safety guard

      if (prev.state === 'room') {
        // Room -> Seat: preserve zoneId, generate new seatId
        const seatId = 'seat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
        next = { state: 'seat', zoneId: prev.zoneId, seatId }
      } else {
        // default, blocked, seat -> no-op (seat only valid on room cells)
        return
      }

    } else {
      return
    }

    if (!next) return

    // Skip if state hasn't changed (no-op avoids dirty batch entries)
    if (prev.state === next.state && prev.zoneId === next.zoneId && prev.seatId === next.seatId) return

    // Apply the cell change
    this.tildeGrid.setCellState(row, col, next.state, next.zoneId, next.seatId)

    // Add to batch for undo/redo
    this.dragBatch.push({ row, col, prev, next })

    // Mark the store dirty so Save Draft becomes enabled
    useBuilderStore.getState().markDirty()
  }
}
