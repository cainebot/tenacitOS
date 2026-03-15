/**
 * ZoneManager — draws colored department zone rectangles in the Phaser OfficeScene
 * and provides zone-aware agent placement via grid packing.
 *
 * Zone bounds are persisted in Supabase (departments.zone_bounds JSONB).
 * Departments without zone_bounds are skipped (no zone rendered).
 *
 * Depth layering:
 *   - Graphics (fill + border): depth 1 — above floor/wall layers (depth 0), below workers (depth 4+)
 *   - Labels: depth 2
 */

import * as Phaser from 'phaser'
import type { DepartmentRow } from '@/types/supabase'

export interface ZoneBounds {
  x: number
  y: number
  width: number
  height: number
  departmentId: string
}

export class ZoneManager {
  private scene: Phaser.Scene
  private graphics: Phaser.GameObjects.Graphics
  private labels: Phaser.GameObjects.Text[] = []
  zones: ZoneBounds[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(1)
  }

  /**
   * Redraws all zone rectangles from persisted zone_bounds.
   * Departments without zone_bounds are skipped.
   */
  updateZones(departments: DepartmentRow[]): void {
    this.graphics.clear()
    this.labels.forEach((l) => l.destroy())
    this.labels = []
    this.zones = []

    const sorted = [...departments].sort((a, b) => a.sort_order - b.sort_order)

    for (const dept of sorted) {
      if (!dept.zone_bounds) continue

      const { x, y, width, height } = dept.zone_bounds

      // Parse '#rrggbb' to integer for Phaser fillStyle
      const colorInt = parseInt(dept.color.replace('#', ''), 16)

      // Semi-transparent fill
      this.graphics.fillStyle(colorInt, 0.08)
      this.graphics.fillRect(x, y, width, height)

      // Solid border
      this.graphics.lineStyle(2, colorInt, 0.4)
      this.graphics.strokeRect(x, y, width, height)

      // Zone label at top-left
      const label = this.scene.add.text(x + 8, y + 8, dept.display_name, {
        fontSize: '11px',
        color: dept.color,
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 4, y: 2 },
      })
      label.setDepth(2)
      this.labels.push(label)

      this.zones.push({ x, y, width, height, departmentId: dept.id })
    }
  }

  /**
   * Returns zone bounds for the given department_id, or null if not found.
   */
  getZoneForDepartment(departmentId: string): ZoneBounds | null {
    return this.zones.find((z) => z.departmentId === departmentId) ?? null
  }

  /**
   * Computes the (x, y) center position for an agent at slotIndex within a zone.
   * Uses a 2-column grid with a 48px top offset for the zone label.
   */
  getPositionInZone(
    zone: ZoneBounds,
    slotIndex: number,
    totalSlots: number,
  ): { x: number; y: number } {
    const cols = 2
    const col = slotIndex % cols
    const row = Math.floor(slotIndex / cols)
    const cellW = zone.width / cols
    const rows = Math.ceil(totalSlots / cols)
    const availableHeight = zone.height - 48
    const cellH = availableHeight / (rows > 0 ? rows : 1)
    return {
      x: zone.x + cellW * col + cellW / 2,
      y: zone.y + 48 + cellH * row + cellH / 2,
    }
  }

  /** Clean up graphics and labels. */
  destroy(): void {
    this.graphics.destroy()
    this.labels.forEach((l) => l.destroy())
    this.labels = []
    this.zones = []
  }
}
