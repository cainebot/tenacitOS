'use client'

import { useEffect, useRef } from 'react'
import { Badge } from '@circos/ui'
import officeEvents from '@/lib/office-events'

/**
 * HTML overlay that renders a crisp zone name badge when the player enters a zone.
 *
 * - Listens to officeEvents (zone:enter / zone:exit) for discrete zone changes.
 * - Reads the Phaser camera ref directly via globalThis.__circos_viewer_cam
 *   (no snapshot lag — same object Phaser writes to, read in-sync via RAF).
 */
export function ZoneBadgeOverlay() {
  const badgeRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const worldPos = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number>(0)
  const activeRef = useRef(false)

  // Listen to officeEvents for zone enter/exit
  useEffect(() => {
    const onEnter = (payload: { zoneId: string; label: string; badgeWorldX: number; badgeWorldY: number }) => {
      worldPos.current = { x: payload.badgeWorldX, y: payload.badgeWorldY }
      activeRef.current = true
      if (labelRef.current) labelRef.current.textContent = payload.label
      if (badgeRef.current) badgeRef.current.style.opacity = '1'
    }

    const onExit = () => {
      activeRef.current = false
      worldPos.current = null
      if (badgeRef.current) badgeRef.current.style.opacity = '0'
    }

    officeEvents.on('zone:enter', onEnter)
    officeEvents.on('zone:exit', onExit)
    return () => {
      officeEvents.off('zone:enter', onEnter)
      officeEvents.off('zone:exit', onExit)
    }
  }, [])

  // RAF loop: read Phaser camera directly for world→screen
  useEffect(() => {
    const tick = () => {
      const el = badgeRef.current
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cam = (globalThis as any).__circos_viewer_cam as
        | { worldView: { x: number; y: number }; zoom: number }
        | undefined

      if (activeRef.current && worldPos.current && el && cam) {
        const sx = (worldPos.current.x - cam.worldView.x) * cam.zoom
        const sy = (worldPos.current.y - cam.worldView.y) * cam.zoom
        el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, 0)`
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <div
        ref={badgeRef}
        className="absolute top-0 left-0 will-change-transform transition-opacity duration-200"
        style={{ opacity: 0 }}
      >
        <Badge color="gray" size="md" type="modern">
          <span ref={labelRef} />
        </Badge>
      </div>
    </div>
  )
}
