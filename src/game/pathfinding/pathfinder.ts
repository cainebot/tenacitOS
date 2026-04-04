// ── A* Pathfinder with MinHeap priority queue ──
// Inputs:  grid coordinates (cell indices)
// Outputs: pixel coordinates (cell center positions)
// Movement: 4-directional only (no diagonals) — office corridors are axis-aligned

import { NavGrid } from './nav-grid'

// ── MinHeap for A* open set ──
// Stores nodes sorted by f-cost (g + h) with O(log n) push/pop

interface HeapNode {
  cost: number // f = g + h
  x: number
  y: number
}

class MinHeap {
  private heap: HeapNode[] = []

  get size(): number {
    return this.heap.length
  }

  push(item: HeapNode): void {
    this.heap.push(item)
    this.siftUp(this.heap.length - 1)
  }

  pop(): HeapNode | undefined {
    if (this.heap.length === 0) return undefined
    const top = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.siftDown(0)
    }
    return top
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.heap[parent].cost <= this.heap[index].cost) break
      ;[this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]]
      index = parent
    }
  }

  private siftDown(index: number): void {
    const length = this.heap.length
    while (true) {
      const left = 2 * index + 1
      const right = 2 * index + 2
      let smallest = index

      if (left < length && this.heap[left].cost < this.heap[smallest].cost) {
        smallest = left
      }
      if (right < length && this.heap[right].cost < this.heap[smallest].cost) {
        smallest = right
      }
      if (smallest === index) break

      ;[this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]]
      index = smallest
    }
  }
}

// ── 4-directional neighbors (no diagonals) ──
const DIRS = [
  { dx: 0, dy: -1 }, // up
  { dx: 0, dy: 1 },  // down
  { dx: -1, dy: 0 }, // left
  { dx: 1, dy: 0 },  // right
]

/**
 * A* pathfinding with Manhattan heuristic.
 *
 * @param start - Grid cell coordinates (not pixels)
 * @param goal  - Grid cell coordinates (not pixels)
 * @param grid  - NavGrid instance for walkability checks
 * @returns Array of pixel-coordinate waypoints from start to goal (inclusive),
 *          or empty array if no path exists or start === goal.
 */
export function findPath(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  grid: NavGrid,
): Array<{ x: number; y: number }> {
  // Same cell — no movement needed
  if (start.x === goal.x && start.y === goal.y) return []

  // Goal unreachable
  if (!grid.isWalkable(goal.x, goal.y)) return []

  const key = (x: number, y: number) => `${x},${y}`
  const heuristic = (ax: number, ay: number) => Math.abs(ax - goal.x) + Math.abs(ay - goal.y)

  // g-cost map: cheapest known cost to reach each cell
  const gCost = new Map<string, number>()
  gCost.set(key(start.x, start.y), 0)

  // Parent map: for path reconstruction
  const parent = new Map<string, { x: number; y: number } | null>()
  parent.set(key(start.x, start.y), null)

  const open = new MinHeap()
  open.push({ cost: heuristic(start.x, start.y), x: start.x, y: start.y })

  while (open.size > 0) {
    const current = open.pop()!

    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct path (grid coords → pixel coords)
      const path: Array<{ x: number; y: number }> = []
      let node: { x: number; y: number } | null = { x: current.x, y: current.y }
      while (node !== null) {
        path.unshift(grid.gridToPixel(node.x, node.y))
        node = parent.get(key(node.x, node.y)) ?? null
      }
      return path
    }

    const currentG = gCost.get(key(current.x, current.y)) ?? Infinity

    for (const { dx, dy } of DIRS) {
      const nx = current.x + dx
      const ny = current.y + dy

      if (!grid.isWalkable(nx, ny)) continue

      const neighborKey = key(nx, ny)
      const tentativeG = currentG + 1

      if (tentativeG < (gCost.get(neighborKey) ?? Infinity)) {
        gCost.set(neighborKey, tentativeG)
        parent.set(neighborKey, { x: current.x, y: current.y })
        const f = tentativeG + heuristic(nx, ny)
        open.push({ cost: f, x: nx, y: ny })
      }
    }
  }

  // No path found
  return []
}
