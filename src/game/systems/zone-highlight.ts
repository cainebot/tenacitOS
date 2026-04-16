// ── ZoneHighlight — draws a white contour border when the player enters a zone ──
// Algorithm: for each tile in the zone, check 4 neighbours. If a neighbour is NOT
// in the zone, that edge is part of the outer contour. The resulting segments are
// drawn as a continuous white border (Gather-style).
// A floating badge with the zone label is placed at the bottom-center, outside the area.

import Phaser from 'phaser'
import officeEvents from '@/lib/office-events'
import type { Zone } from '@/features/office/types'

const BORDER_COLOR = 0xffffff
const BORDER_ALPHA = 0.9
const BORDER_WIDTH = 5
const FADE_DURATION = 200 // ms

export class ZoneHighlight {
  private scene: Phaser.Scene
  private tileSize: number
  private graphics: Phaser.GameObjects.Graphics
  private cellToZone: Map<string, string> = new Map()
  private zones: Map<string, Zone> = new Map()
  private activeZoneId: string | null = null

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene
    this.tileSize = tileSize
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(3) // above ground(0), below sprites(10+)
    this.graphics.setAlpha(0)
  }

  /** Load zones from the map document */
  setZones(zones: Zone[]): void {
    this.cellToZone.clear()
    this.zones.clear()
    for (const zone of zones) {
      this.zones.set(zone.id, zone)
      for (const cell of zone.gridCells) {
        this.cellToZone.set(`${cell.x},${cell.y}`, zone.id)
      }
    }
  }

  /** Call each frame with the player's pixel position. Returns current zoneId or null. */
  update(playerX: number, playerY: number): string | null {
    const ts = this.tileSize
    const gridX = Math.floor(playerX / ts)
    const gridY = Math.floor(playerY / ts)
    const key = `${gridX},${gridY}`
    const zoneId = this.cellToZone.get(key) ?? null

    if (zoneId !== this.activeZoneId) {
      const prevZoneId = this.activeZoneId
      this.activeZoneId = zoneId

      if (prevZoneId) {
        officeEvents.emit('zone:exit', { zoneId: prevZoneId })
      }

      if (zoneId) {
        const zone = this.zones.get(zoneId)!
        // Compute badge position: bottom-center of zone bounding box
        const ts = this.tileSize
        let minX = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const c of zone.gridCells) {
          const px = c.x * ts
          if (px < minX) minX = px
          if (px + ts > maxX) maxX = px + ts
          if (c.y * ts + ts > maxY) maxY = c.y * ts + ts
        }
        officeEvents.emit('zone:enter', {
          zoneId,
          label: zone.label,
          badgeWorldX: (minX + maxX) / 2,
          badgeWorldY: maxY + 10,
        })
        this.drawBorder(zone)
        // Fade in border
        this.scene.tweens.add({
          targets: this.graphics,
          alpha: BORDER_ALPHA,
          duration: FADE_DURATION,
          ease: 'Sine.easeOut',
        })
      } else {
        // Fade out border
        this.scene.tweens.add({
          targets: this.graphics,
          alpha: 0,
          duration: FADE_DURATION,
          ease: 'Sine.easeIn',
        })
      }
    }

    return zoneId
  }

  // ── Border drawing ──

  /** Draw the outer contour of a zone as line segments */
  private drawBorder(zone: Zone): void {
    this.graphics.clear()
    this.graphics.lineStyle(BORDER_WIDTH, BORDER_COLOR, 1)

    const ts = this.tileSize
    const cellSet = new Set<string>()
    for (const c of zone.gridCells) {
      cellSet.add(`${c.x},${c.y}`)
    }

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    for (const cell of zone.gridCells) {
      const px = cell.x * ts
      const py = cell.y * ts

      // Top edge
      if (!cellSet.has(`${cell.x},${cell.y - 1}`)) {
        segments.push({ x1: px, y1: py, x2: px + ts, y2: py })
      }
      // Bottom edge
      if (!cellSet.has(`${cell.x},${cell.y + 1}`)) {
        segments.push({ x1: px, y1: py + ts, x2: px + ts, y2: py + ts })
      }
      // Left edge
      if (!cellSet.has(`${cell.x - 1},${cell.y}`)) {
        segments.push({ x1: px, y1: py, x2: px, y2: py + ts })
      }
      // Right edge
      if (!cellSet.has(`${cell.x + 1},${cell.y}`)) {
        segments.push({ x1: px + ts, y1: py, x2: px + ts, y2: py + ts })
      }
    }

    // Draw connected paths with rounded corners
    const paths = this.buildContourPaths(segments)
    const r = Math.min(8, ts * 0.12) // corner radius

    for (const path of paths) {
      if (path.length < 2) continue
      this.drawRoundedPath(path, r)
    }
  }

  /**
   * Connect line segments into ordered paths (polygons).
   * Each segment shares endpoints with its neighbours — we chain them.
   */
  private buildContourPaths(
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  ): Array<Array<{ x: number; y: number }>> {
    const adj = new Map<string, number[]>()
    const ptKey = (x: number, y: number) => `${x},${y}`

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      const k1 = ptKey(s.x1, s.y1)
      const k2 = ptKey(s.x2, s.y2)
      if (!adj.has(k1)) adj.set(k1, [])
      if (!adj.has(k2)) adj.set(k2, [])
      adj.get(k1)!.push(i)
      adj.get(k2)!.push(i)
    }

    const used = new Set<number>()
    const paths: Array<Array<{ x: number; y: number }>> = []

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue

      const path: Array<{ x: number; y: number }> = []
      let current = i
      let currentPt = { x: segments[i].x1, y: segments[i].y1 }
      path.push({ ...currentPt })

      while (true) {
        used.add(current)
        const s = segments[current]
        const otherEnd =
          (currentPt.x === s.x1 && currentPt.y === s.y1)
            ? { x: s.x2, y: s.y2 }
            : { x: s.x1, y: s.y1 }
        path.push({ ...otherEnd })
        currentPt = otherEnd

        const key = ptKey(currentPt.x, currentPt.y)
        const candidates = adj.get(key)
        let next = -1
        if (candidates) {
          for (const c of candidates) {
            if (!used.has(c)) {
              next = c
              break
            }
          }
        }

        if (next === -1) break
        current = next
      }

      paths.push(path)
    }

    return paths
  }

  /** Draw a path with rounded corners at turns */
  private drawRoundedPath(points: Array<{ x: number; y: number }>, radius: number): void {
    if (points.length < 2) return

    this.graphics.beginPath()

    if (points.length === 2) {
      this.graphics.moveTo(points[0].x, points[0].y)
      this.graphics.lineTo(points[1].x, points[1].y)
      this.graphics.strokePath()
      return
    }

    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        const next = points[1]
        const dx = next.x - points[0].x
        const dy = next.y - points[0].y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) continue
        const r = Math.min(radius, len / 2)
        this.graphics.moveTo(
          points[0].x + (dx / len) * r,
          points[0].y + (dy / len) * r,
        )
      } else if (i === points.length - 1) {
        const prev = points[i - 1]
        const dx = points[i].x - prev.x
        const dy = points[i].y - prev.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) continue
        const r = Math.min(radius, len / 2)
        this.graphics.lineTo(
          points[i].x - (dx / len) * r,
          points[i].y - (dy / len) * r,
        )
      } else {
        const prev = points[i - 1]
        const curr = points[i]
        const next = points[i + 1]

        const dx1 = curr.x - prev.x
        const dy1 = curr.y - prev.y
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)

        const dx2 = next.x - curr.x
        const dy2 = next.y - curr.y
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

        if (len1 === 0 || len2 === 0) continue

        const r = Math.min(radius, len1 / 2, len2 / 2)

        const bx = curr.x - (dx1 / len1) * r
        const by = curr.y - (dy1 / len1) * r
        const ax = curr.x + (dx2 / len2) * r
        const ay = curr.y + (dy2 / len2) * r

        this.graphics.lineTo(bx, by)
        this.graphics.lineTo(ax, ay)
      }
    }

    this.graphics.strokePath()
  }

  destroy(): void {
    this.graphics.destroy()
  }
}
