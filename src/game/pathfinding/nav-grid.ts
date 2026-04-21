// ── NavGrid — tracks walkable/blocked cells for A* pathfinding ──
// All coordinates are in GRID cells (not pixels).
// Use gridToPixel() to convert grid coords to pixel centers.

export class NavGrid {
  readonly width: number
  readonly height: number
  readonly cellSize: number

  private blocked: Set<string>

  constructor(width: number, height: number, cellSize: number) {
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.blocked = new Set()
  }

  /** Returns true if the cell is within bounds and not blocked */
  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false
    return !this.blocked.has(`${x},${y}`)
  }

  /** Mark a single cell as impassable */
  setBlocked(x: number, y: number): void {
    this.blocked.add(`${x},${y}`)
  }

  /** Mark multiple cells as impassable (bulk operation) */
  setBlockedCells(cells: Array<{ x: number; y: number }>): void {
    for (const cell of cells) {
      this.blocked.add(`${cell.x},${cell.y}`)
    }
  }

  /**
   * Convert grid coordinates to pixel center coordinates.
   * A 64px cell at grid(2,3) has its center at pixel(2*64+32, 3*64+32) = (160, 224).
   */
  gridToPixel(gx: number, gy: number): { x: number; y: number } {
    return {
      x: gx * this.cellSize + this.cellSize / 2,
      y: gy * this.cellSize + this.cellSize / 2,
    }
  }
}
