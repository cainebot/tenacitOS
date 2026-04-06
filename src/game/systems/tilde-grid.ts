import Phaser from 'phaser'
import type { Zone } from '@/features/office/types'

export interface TildeCell {
  state: 'default' | 'hover' | 'blocked' | 'room' | 'seat'
  zoneId: string | null
  seatId: string | null
}

const TILDE_COLORS = {
  default: { bg: 0x535862, alpha: 0.1, border: 0xd5d7da },
  hover:   { bg: 0x535862, alpha: 0.5, border: 0xd5d7da },
  blocked: { bg: 0xf04438, alpha: 0.5, border: 0xf04438 },
  room:    { bg: 0x6172f3, alpha: 0.5, border: 0x6172f3 },
  seat:    { bg: 0x6172f3, alpha: 0.5, border: 0x6172f3 },
} as const

export class TildeGrid {
  private grid: TildeCell[][]
  private graphics: Phaser.GameObjects.Graphics
  private textPool: Map<string, Phaser.GameObjects.Text> = new Map()
  private hoverCell: { row: number; col: number } | null = null
  private hoverRect: { startRow: number; startCol: number; endRow: number; endCol: number } | null = null
  private dirty = true
  private cols: number
  private rows: number
  private tileSize: number
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene, cols: number, rows: number, tileSize: number) {
    this.scene = scene
    this.cols = cols
    this.rows = rows
    this.tileSize = tileSize

    // Single Graphics object at depth 5 (above ground 0, below agents 10+)
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(5)

    // Initialize grid with all default cells
    this.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        state: 'default' as const,
        zoneId: null,
        seatId: null,
      }))
    )

    // Mark dirty when camera moves or zooms
    scene.cameras.main.on('followupdate', () => { this.dirty = true })
    scene.cameras.main.on('zoom', () => { this.dirty = true })
  }

  setHoverCell(row: number, col: number): void {
    this.hoverCell = { row, col }
    this.dirty = true
  }

  clearHover(): void {
    this.hoverCell = null
    this.dirty = true
  }

  setHoverRect(startRow: number, startCol: number, endRow: number, endCol: number): void {
    this.hoverRect = { startRow, startCol, endRow, endCol }
    this.dirty = true
  }

  clearHoverRect(): void {
    this.hoverRect = null
    this.dirty = true
  }

  setCellState(
    row: number,
    col: number,
    state: TildeCell['state'],
    zoneId?: string | null,
    seatId?: string | null,
  ): void {
    // Bounds check
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return
    this.grid[row][col] = {
      state,
      zoneId: zoneId ?? null,
      seatId: seatId ?? null,
    }
    this.dirty = true
  }

  getCellState(row: number, col: number): TildeCell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null
    return this.grid[row][col]
  }

  getGrid(): TildeCell[][] {
    return this.grid
  }

  /** Initialize grid from existing zone data (used to restore painted cells from map_json). */
  loadFromZones(zones: Zone[]): void {
    // Clear all non-default cells first
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = { state: 'default', zoneId: null, seatId: null }
      }
    }

    for (const zone of zones) {
      // Paint room cells
      for (const cell of zone.gridCells) {
        this.setCellState(cell.y, cell.x, 'room', zone.id, null)
      }
      // Paint seat cells
      if (zone.seats) {
        for (const seat of zone.seats) {
          this.setCellState(seat.gridY, seat.gridX, 'seat', zone.id, seat.id)
        }
      }
    }

    this.dirty = true
  }

  /** Main render loop. Returns immediately if not dirty. */
  update(zones: Zone[]): void {
    if (!this.dirty) return
    this.dirty = false

    const gfx = this.graphics
    gfx.clear()

    // Build a quick lookup: zoneId -> displayOrder for zone number labels
    const zoneOrderMap = new Map<string, number>()
    for (const zone of zones) {
      if (zone.displayOrder !== undefined) {
        zoneOrderMap.set(zone.id, zone.displayOrder)
      }
    }

    const cam = this.scene.cameras.main
    const ts = this.tileSize

    // Viewport culling — only render cells visible in the camera view
    const startCol = Math.max(0, Math.floor(cam.worldView.x / ts))
    const startRow = Math.max(0, Math.floor(cam.worldView.y / ts))
    const endCol = Math.min(this.cols - 1, Math.ceil((cam.worldView.x + cam.worldView.width) / ts))
    const endRow = Math.min(this.rows - 1, Math.ceil((cam.worldView.y + cam.worldView.height) / ts))

    // Track which text keys are visible in this frame
    const visibleTextKeys = new Set<string>()

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = this.grid[row][col]
        const px = col * ts
        const py = row * ts

        // Determine render state: hover overlay on non-blocked cells
        const isInHoverRect = this.hoverRect &&
          row >= Math.min(this.hoverRect.startRow, this.hoverRect.endRow) &&
          row <= Math.max(this.hoverRect.startRow, this.hoverRect.endRow) &&
          col >= Math.min(this.hoverRect.startCol, this.hoverRect.endCol) &&
          col <= Math.max(this.hoverRect.startCol, this.hoverRect.endCol)

        const renderState =
          isInHoverRect
            ? 'hover'
            : this.hoverCell?.row === row && this.hoverCell?.col === col && cell.state !== 'blocked'
              ? 'hover'
              : cell.state

        const colors = TILDE_COLORS[renderState]

        // Fill
        gfx.fillStyle(colors.bg, colors.alpha)
        gfx.fillRect(px, py, ts, ts)

        // Border
        gfx.lineStyle(1, colors.border, 0.6)
        gfx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1)

        // Blocked cell icon: prohibited sign (circle + diagonal line)
        if (cell.state === 'blocked') {
          gfx.lineStyle(2, 0xf04438, 0.9)
          gfx.strokeCircle(px + ts / 2, py + ts / 2, 6)
          gfx.lineBetween(
            px + ts / 2 - 4, py + ts / 2 + 4,
            px + ts / 2 + 4, py + ts / 2 - 4,
          )
        }

        // Seat cell icon: simple armchair silhouette
        if (cell.state === 'seat') {
          // Backrest
          gfx.fillStyle(0x2d3282, 0.8)
          gfx.fillRoundedRect(px + ts / 2 - 8, py + ts / 2 - 10, 16, 14, 3)
          // Seat cushion (wider)
          gfx.fillRoundedRect(px + ts / 2 - 10, py + ts / 2 + 2, 20, 6, 2)
          // Left armrest
          gfx.fillRect(px + ts / 2 - 12, py + ts / 2 - 4, 3, 8)
          // Right armrest
          gfx.fillRect(px + ts / 2 + 9, py + ts / 2 - 4, 3, 8)
        }

        // Zone number label for room cells (centered) and seat cells (top-right)
        if (cell.state === 'room' || cell.state === 'seat') {
          const key = `${row}-${col}`
          const displayOrder = cell.zoneId ? (zoneOrderMap.get(cell.zoneId) ?? 0) : 0
          const label = String(displayOrder)
          visibleTextKeys.add(key)

          if (cell.state === 'seat') {
            // Seat: zone number at top-right corner
            if (this.textPool.has(key)) {
              const text = this.textPool.get(key)!
              text.setText(label)
              text.setPosition(px + ts - 4, py + 4)
              text.setOrigin(1, 0)
              text.setVisible(true)
            } else {
              const text = this.scene.add
                .text(px + ts - 4, py + 4, label, {
                  fontFamily: 'JetBrains Mono',
                  fontSize: '10px',
                  color: '#2d3282',
                })
                .setOrigin(1, 0)
                .setDepth(6)
              this.textPool.set(key, text)
            }
          } else {
            // Room: zone number centered
            if (this.textPool.has(key)) {
              const text = this.textPool.get(key)!
              text.setText(label)
              text.setPosition(px + ts / 2, py + ts / 2)
              text.setOrigin(0.5)
              text.setVisible(true)
            } else {
              const text = this.scene.add
                .text(px + ts / 2, py + ts / 2, label, {
                  fontFamily: 'JetBrains Mono',
                  fontSize: '10px',
                  color: '#2d3282',
                })
                .setOrigin(0.5)
                .setDepth(6)
              this.textPool.set(key, text)
            }
          }
        }
      }
    }

    // Hide text objects that are no longer in the visible/room/seat region
    for (const [key, text] of this.textPool) {
      if (!visibleTextKeys.has(key)) {
        text.setVisible(false)
      }
    }
  }

  /**
   * Serialize the current grid state into an updated OfficeMapDocument.
   * Hover state is transient and never serialized.
   */
  serialize(currentZones: import('@/features/office/types').Zone[], baseMapDoc: import('@/features/office/types').OfficeMapDocument): import('@/features/office/types').OfficeMapDocument {
    // Build lookup: zoneId -> { gridCells, seats }
    const zoneMap = new Map<string, { gridCells: Array<{ x: number; y: number }>; seats: Array<{ id: string; gridX: number; gridY: number }> }>()

    // Initialize map for all zones
    for (const zone of currentZones) {
      zoneMap.set(zone.id, { gridCells: [], seats: [] })
    }

    // Collect blocked cells
    const blocked: Array<{ x: number; y: number }> = []

    // Iterate grid — skip 'default' and 'hover' (transient, do not persist)
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.grid[row][col]
        if (cell.state === 'blocked') {
          blocked.push({ x: col, y: row })
        } else if ((cell.state === 'room' || cell.state === 'seat') && cell.zoneId) {
          const entry = zoneMap.get(cell.zoneId)
          if (entry) {
            entry.gridCells.push({ x: col, y: row })
            if (cell.state === 'seat' && cell.seatId) {
              entry.seats.push({ id: cell.seatId, gridX: col, gridY: row })
            }
          }
        }
      }
    }

    // Build updated zones array
    const updatedZones = currentZones.map((z) => ({
      ...z,
      gridCells: zoneMap.get(z.id)?.gridCells ?? [],
      seats: zoneMap.get(z.id)?.seats ?? [],
    }))

    return {
      ...baseMapDoc,
      zones: updatedZones,
      navGrid: {
        ...baseMapDoc.navGrid,
        blocked,
      },
    }
  }

  /** Load blocked cells from navGrid data (e.g., mapDocument.navGrid.blocked). */
  loadBlockedCells(blocked: Array<{ x: number; y: number }>): void {
    for (const cell of blocked) {
      if (cell.y >= 0 && cell.y < this.rows && cell.x >= 0 && cell.x < this.cols) {
        this.grid[cell.y][cell.x] = { state: 'blocked', zoneId: null, seatId: null }
      }
    }
    this.dirty = true
  }

  destroy(): void {
    this.graphics.destroy()
    for (const text of this.textPool.values()) {
      text.destroy()
    }
    this.textPool.clear()
  }
}
