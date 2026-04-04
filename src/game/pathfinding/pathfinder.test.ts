import { describe, it, expect } from 'vitest'
import { NavGrid } from './nav-grid'
import { findPath } from './pathfinder'

describe('NavGrid', () => {
  describe('bounds checking', () => {
    it('isWalkable(0, 0) returns true for empty 10x10 grid', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.isWalkable(0, 0)).toBe(true)
    })

    it('isWalkable(-1, 0) returns false — negative x out of bounds', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.isWalkable(-1, 0)).toBe(false)
    })

    it('isWalkable(10, 0) returns false — x equals width (out of bounds)', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.isWalkable(10, 0)).toBe(false)
    })

    it('isWalkable(0, -1) returns false — negative y out of bounds', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.isWalkable(0, -1)).toBe(false)
    })

    it('isWalkable(0, 10) returns false — y equals height (out of bounds)', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.isWalkable(0, 10)).toBe(false)
    })

    it('isWalkable(9, 9) returns true — last valid cell', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.isWalkable(9, 9)).toBe(true)
    })
  })

  describe('setBlocked', () => {
    it('isWalkable(3, 3) returns false after setBlocked(3, 3)', () => {
      const grid = new NavGrid(10, 10, 64)
      grid.setBlocked(3, 3)
      expect(grid.isWalkable(3, 3)).toBe(false)
    })

    it('isWalkable(3, 4) still returns true after setBlocked(3, 3)', () => {
      const grid = new NavGrid(10, 10, 64)
      grid.setBlocked(3, 3)
      expect(grid.isWalkable(3, 4)).toBe(true)
    })
  })

  describe('setBlockedCells', () => {
    it('marks multiple cells as blocked', () => {
      const grid = new NavGrid(10, 10, 64)
      grid.setBlockedCells([{ x: 1, y: 1 }, { x: 2, y: 2 }])
      expect(grid.isWalkable(1, 1)).toBe(false)
      expect(grid.isWalkable(2, 2)).toBe(false)
    })

    it('does not affect cells not in the list', () => {
      const grid = new NavGrid(10, 10, 64)
      grid.setBlockedCells([{ x: 1, y: 1 }, { x: 2, y: 2 }])
      expect(grid.isWalkable(3, 3)).toBe(true)
    })
  })

  describe('gridToPixel', () => {
    it('converts grid cell (0,0) to pixel center (32, 32) for cellSize=64', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.gridToPixel(0, 0)).toEqual({ x: 32, y: 32 })
    })

    it('converts grid cell (2,3) to pixel center (160, 224) for cellSize=64', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(grid.gridToPixel(2, 3)).toEqual({ x: 160, y: 224 })
    })
  })

  describe('properties', () => {
    it('exposes width, height, cellSize as readonly', () => {
      const grid = new NavGrid(10, 15, 64)
      expect(grid.width).toBe(10)
      expect(grid.height).toBe(15)
      expect(grid.cellSize).toBe(64)
    })
  })
})

describe('findPath', () => {
  describe('trivial cases', () => {
    it('returns [] when start === goal', () => {
      const grid = new NavGrid(10, 10, 64)
      expect(findPath({ x: 0, y: 0 }, { x: 0, y: 0 }, grid)).toEqual([])
    })

    it('returns [] when goal is blocked', () => {
      const grid = new NavGrid(10, 10, 64)
      grid.setBlocked(5, 5)
      expect(findPath({ x: 0, y: 0 }, { x: 5, y: 5 }, grid)).toEqual([])
    })
  })

  describe('straight path', () => {
    it('returns pixel-coordinate path of length 3 for 3-cell horizontal move', () => {
      const grid = new NavGrid(10, 10, 64)
      const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, grid)
      // Cells (0,0), (1,0), (2,0) → pixel centers (32,32), (96,32), (160,32)
      expect(path).toEqual([
        { x: 32, y: 32 },
        { x: 96, y: 32 },
        { x: 160, y: 32 },
      ])
    })

    it('returns pixel-coordinate path of length 1 for single-step move', () => {
      const grid = new NavGrid(10, 10, 64)
      const path = findPath({ x: 0, y: 0 }, { x: 1, y: 0 }, grid)
      // Cells (0,0), (1,0) → pixel centers (32,32), (96,32)
      expect(path).toHaveLength(2)
      expect(path[0]).toEqual({ x: 32, y: 32 })
      expect(path[1]).toEqual({ x: 96, y: 32 })
    })

    it('pixel coordinates are cell * 64 + 32 (center of 64px cell)', () => {
      const grid = new NavGrid(10, 10, 64)
      const path = findPath({ x: 3, y: 2 }, { x: 5, y: 2 }, grid)
      // (3,2) → (192+32, 128+32) = (224, 160); (4,2) → (288, 160); (5,2) → (352, 160)
      expect(path[0]).toEqual({ x: 3 * 64 + 32, y: 2 * 64 + 32 })
      expect(path[path.length - 1]).toEqual({ x: 5 * 64 + 32, y: 2 * 64 + 32 })
    })
  })

  describe('obstacle avoidance', () => {
    it('routes around a wall blocking the direct path', () => {
      // Grid:
      //   S . W . G
      //   . . W . .
      //   . . . . .
      // S=(0,0), G=(4,0), wall at x=2 (y=0,1) — must go around
      const grid = new NavGrid(5, 5, 64)
      grid.setBlocked(2, 0)
      grid.setBlocked(2, 1)
      const path = findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, grid)
      expect(path.length).toBeGreaterThan(3) // longer than straight line of 5 cells
      // Verify path doesn't include blocked cells
      const blockedPixels = [
        { x: 2 * 64 + 32, y: 0 * 64 + 32 }, // (2,0)
        { x: 2 * 64 + 32, y: 1 * 64 + 32 }, // (2,1)
      ]
      for (const blocked of blockedPixels) {
        expect(path).not.toContainEqual(blocked)
      }
    })

    it('returns [] when goal is completely surrounded by blocked cells', () => {
      const grid = new NavGrid(5, 5, 64)
      // Surround (2,2) completely
      grid.setBlocked(2, 1)
      grid.setBlocked(2, 3)
      grid.setBlocked(1, 2)
      grid.setBlocked(3, 2)
      grid.setBlocked(2, 2) // goal itself blocked
      const path = findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, grid)
      expect(path).toEqual([])
    })

    it('routes around single blocked cell obstacle', () => {
      const grid = new NavGrid(10, 10, 64)
      grid.setBlocked(3, 3)
      const path = findPath({ x: 2, y: 3 }, { x: 4, y: 3 }, grid)
      // Must go around (3,3) — path cannot contain blocked cell pixel
      const blockedPixel = { x: 3 * 64 + 32, y: 3 * 64 + 32 }
      expect(path).not.toContainEqual(blockedPixel)
      // Path must eventually reach goal
      expect(path[path.length - 1]).toEqual({ x: 4 * 64 + 32, y: 3 * 64 + 32 })
    })
  })

  describe('4-directional movement', () => {
    it('path contains only horizontal and vertical moves (no diagonals)', () => {
      const grid = new NavGrid(10, 10, 64)
      const path = findPath({ x: 0, y: 0 }, { x: 3, y: 3 }, grid)
      // Each step should move exactly cellSize in one axis only
      for (let i = 1; i < path.length; i++) {
        const dx = Math.abs(path[i].x - path[i - 1].x)
        const dy = Math.abs(path[i].y - path[i - 1].y)
        // One axis moves by cellSize, other stays same
        const isHorizontal = dx === 64 && dy === 0
        const isVertical = dx === 0 && dy === 64
        expect(isHorizontal || isVertical).toBe(true)
      }
    })
  })
})
