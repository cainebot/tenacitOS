import Phaser from 'phaser'
import { toast } from 'sonner'
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
      this.toastShownThisDrag = false
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
          execute: () => batch.forEach(b => grid.setCellState(b.row, b.col, b.next)),
          undo: () => batch.forEach(b => grid.setCellState(b.row, b.col, b.prev)),
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

  /** Throttle toast: only show once per drag session */
  private toastShownThisDrag = false

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
      if (!selectedZoneId) return

      // Zone tool: set zoneId + clear seat, DON'T touch blocked
      next = { zoneId: selectedZoneId, seatId: null, blocked: prev.blocked }

    } else if (activeTool === 'eraser') {
      // Erase: clear everything back to empty
      if (!prev.zoneId && !prev.seatId && !prev.blocked) return  // no-op — already empty

      next = { zoneId: null, seatId: null, blocked: false }

    } else if (activeTool === 'blocked') {
      if (prev.blocked) return  // no-op — already blocked

      // Blocked tool: cannot place blocked on a seat
      if (prev.seatId) {
        if (!this.toastShownThisDrag) {
          this.toastShownThisDrag = true
          toast.error('No se puede bloquear una celda con seat. Elimina el seat primero.')
        }
        return
      }

      // Set blocked flag, DON'T touch zone data
      next = { zoneId: prev.zoneId, seatId: null, blocked: true }

    } else if (activeTool === 'seat') {
      if (!selectedZoneId) return

      // Seat tool: cannot place seat on blocked cell
      if (prev.blocked) {
        if (!this.toastShownThisDrag) {
          this.toastShownThisDrag = true
          toast.error('No se puede colocar un seat en una celda bloqueada.')
        }
        return
      }

      // Seat only valid on cells that have a zone
      if (!prev.zoneId) return

      // Already a seat — no-op
      if (prev.seatId) return

      const seatId = 'seat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      next = { zoneId: prev.zoneId, seatId, blocked: false }

    } else {
      return
    }

    if (!next) return

    // Skip if state hasn't changed
    if (prev.zoneId === next.zoneId && prev.seatId === next.seatId && prev.blocked === next.blocked) return

    // Apply the cell change
    this.tildeGrid.setCellState(row, col, next)

    // Add to batch for undo/redo
    this.dragBatch.push({ row, col, prev, next })

    // Mark the store dirty so Save Draft becomes enabled
    useBuilderStore.getState().markDirty()
  }
}
