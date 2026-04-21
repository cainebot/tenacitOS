'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Badge } from '@circos/ui'
import { useBuilderStore } from '../stores/builder-store'

const TILE_SIZE = 64

/**
 * HTML overlay that renders zone name badges on top of the Phaser canvas.
 * Badges are positioned at each zone's bounding-box center via RAF-driven
 * DOM updates (no React re-renders per frame). They stay crisp at any zoom
 * level because they live outside Phaser's pixel-art renderer.
 */
export function ZoneLabelOverlay() {
  const zones = useBuilderStore((s) => s.zones)
  const badgeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const rafRef = useRef<number>(0)

  const setBadgeRef = useCallback(
    (zoneId: string) => (el: HTMLDivElement | null) => {
      if (el) badgeRefs.current.set(zoneId, el)
      else badgeRefs.current.delete(zoneId)
    },
    [],
  )

  useEffect(() => {
    // Precompute zone centers in world pixels (bounding-box center)
    const centers = new Map<string, { worldX: number; worldY: number }>()
    for (const zone of zones) {
      if (!zone.gridCells?.length) continue
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const c of zone.gridCells) {
        const px = c.x * TILE_SIZE
        const py = c.y * TILE_SIZE
        if (px < minX) minX = px
        if (px + TILE_SIZE > maxX) maxX = px + TILE_SIZE
        if (py < minY) minY = py
        if (py + TILE_SIZE > maxY) maxY = py + TILE_SIZE
      }
      centers.set(zone.id, {
        worldX: (minX + maxX) / 2,
        worldY: (minY + maxY) / 2,
      })
    }

    const tick = () => {
      const cam = (globalThis as any).__circos_builder_cam as
        | { worldViewX: number; worldViewY: number; zoom: number }
        | undefined

      if (cam) {
        for (const [zoneId, el] of badgeRefs.current) {
          const center = centers.get(zoneId)
          if (!center) {
            el.style.display = 'none'
            continue
          }
          const sx = (center.worldX - cam.worldViewX) * cam.zoom
          const sy = (center.worldY - cam.worldViewY) * cam.zoom
          el.style.display = ''
          el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [zones])

  const visibleZones = zones.filter((z) => z.gridCells?.length > 0)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {visibleZones.map((zone) => (
        <div
          key={zone.id}
          ref={setBadgeRef(zone.id)}
          className="absolute top-0 left-0 will-change-transform"
        >
          <Badge color="gray" size="md" type="modern">
            {zone.label}
          </Badge>
        </div>
      ))}
    </div>
  )
}
