import Phaser from 'phaser'
import { useBuilderStore } from '@/features/office/builder/stores/builder-store'
import { commandHistory, type PaintCommand } from '@/features/office/builder/stores/command-history'
import type { TildeGrid, TildeCell } from './tilde-grid'

export class BuilderInputHandler {
  private scene: Phaser.Scene
  private tildeGrid: TildeGrid
  private tileSize: number
  private cols: number
  private rows: number
  private isDragging = false
  private dragBatch: Array<{ row: number; col: number; prev: TildeCell; next: TildeCell }> = []
  private lastPaintedCell: { row: number; col: number } | null = null

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

      const { activeTool } = useBuilderStore.getState()

      // Hand tool: panning is handled by BuilderScene directly
      if (activeTool === 'hand') return

      this.isDragging = true
      this.dragBatch = []
      this.lastPaintedCell = null

      const cell = this.pixelToCell(ptr)
      if (cell) {
        this.processCell(cell.row, cell.col)
      }
    })

    this.scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const cell = this.pixelToCell(ptr)

      if (this.isDragging && ptr.isDown) {
        // Paint during drag
        if (cell) {
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

    this.scene.input.on('pointerup', () => {
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

    } else {
      // Blocked and Seat tools implemented in Plan 04
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
