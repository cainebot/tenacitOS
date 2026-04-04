'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { snapshot } from '@/game/state-snapshot'

const MAP_W = 200
const MAP_H = 142
const MARGIN = 16
const RADIUS = 16

const DOT_AGENT_R = 4
const DOT_PLAYER_R = 5

const STATUS_HEX: Record<string, string> = {
  active: '#12b76a',
  idle: '#667085',
  working: '#f79009',
  busy: '#f79009',
  error: '#f04438',
  offline: '#f04438',
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

function cornerPos(corner: Corner, parentW: number, parentH: number) {
  switch (corner) {
    case 'top-left':     return { x: MARGIN, y: MARGIN }
    case 'top-right':    return { x: parentW - MAP_W - MARGIN, y: MARGIN }
    case 'bottom-left':  return { x: MARGIN, y: parentH - MAP_H - MARGIN }
    case 'bottom-right': return { x: parentW - MAP_W - MARGIN, y: parentH - MAP_H - MARGIN }
  }
}

function nearestCorner(cx: number, cy: number, parentW: number, parentH: number): Corner {
  const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  let best: Corner = 'bottom-left'
  let bestDist = Infinity

  for (const c of corners) {
    const p = cornerPos(c, parentW, parentH)
    const dx = (p.x + MAP_W / 2) - cx
    const dy = (p.y + MAP_H / 2) - cy
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best
}

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLElement | null>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const cornerRef = useRef<Corner>('bottom-left')
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)
  const frameRef = useRef(0)

  const getParentSize = useCallback(() => {
    const parent = parentRef.current
    if (!parent) return { w: 800, h: 600 }
    return { w: parent.clientWidth, h: parent.clientHeight }
  }, [])

  const snapTo = useCallback((corner: Corner) => {
    const { w, h } = getParentSize()
    const p = cornerPos(corner, w, h)
    cornerRef.current = corner
    posRef.current = p
    setPos(p)
  }, [getParentSize])

  useEffect(() => {
    const el = containerRef.current?.parentElement ?? null
    parentRef.current = el
    snapTo('bottom-left')

    const onResize = () => snapTo(cornerRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [snapTo])

  // Draw loop — reads from state snapshot every frame
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // HiDPI: scale canvas buffer for crisp rendering on Retina displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = MAP_W * dpr
    canvas.height = MAP_H * dpr
    ctx.scale(dpr, dpr)

    const draw = () => {
      frameRef.current++
      ctx.clearRect(0, 0, MAP_W, MAP_H)

      // Gate: only draw when Phaser is ready
      if (snapshot.lifecycle !== 'ready') {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const { world, player, agents, camera, minimapBg } = snapshot

      if (world.width <= 0 || world.height <= 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      // ── Background: tilemap (Phaser-generated ImageBitmap) ──
      if (minimapBg) {
        ctx.drawImage(minimapBg, 0, 0, MAP_W, MAP_H)
      }

      // ── Viewport rectangle ──
      const vx = (camera.x / world.width) * MAP_W
      const vy = (camera.y / world.height) * MAP_H
      const vw = (camera.w / world.width) * MAP_W
      const vh = (camera.h / world.height) * MAP_H

      // Fill
      ctx.fillStyle = 'rgba(68, 76, 231, 0.12)'
      ctx.fillRect(vx, vy, vw, vh)
      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(vx + 0.5, vy + 0.5, vw, vh)

      // ── Agent dots ──
      for (const agent of agents) {
        const mx = (agent.x / world.width) * MAP_W
        const my = (agent.y / world.height) * MAP_H
        const color = STATUS_HEX[agent.status] ?? '#667085'

        // Outer glow
        ctx.beginPath()
        ctx.arc(mx, my, DOT_AGENT_R + 2, 0, Math.PI * 2)
        if (color.startsWith('#')) {
          const r = parseInt(color.slice(1, 3), 16)
          const g = parseInt(color.slice(3, 5), 16)
          const b = parseInt(color.slice(5, 7), 16)
          ctx.fillStyle = `rgba(${r},${g},${b},0.25)`
        }
        ctx.fill()

        // Inner dot
        ctx.beginPath()
        ctx.arc(mx, my, DOT_AGENT_R, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }

      // ── Player dot (drawn last, on top) ──
      const pmx = (player.x / world.width) * MAP_W
      const pmy = (player.y / world.height) * MAP_H

      // Pulsing outer ring
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(frameRef.current * 0.04))
      ctx.beginPath()
      ctx.arc(pmx, pmy, DOT_PLAYER_R + 3, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.5})`
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Solid white dot
      ctx.beginPath()
      ctx.arc(pmx, pmy, DOT_PLAYER_R, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Drag handlers (unchanged)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!containerRef.current) return
    dragRef.current = {
      offsetX: e.clientX - posRef.current.x,
      offsetY: e.clientY - posRef.current.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const { w, h } = getParentSize()
    const nx = Math.max(0, Math.min(e.clientX - dragRef.current.offsetX, w - MAP_W))
    const ny = Math.max(0, Math.min(e.clientY - dragRef.current.offsetY, h - MAP_H))
    posRef.current = { x: nx, y: ny }
    setPos({ x: nx, y: ny })
  }, [getParentSize])

  const onPointerUp = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    const { w, h } = getParentSize()
    const cx = posRef.current.x + MAP_W / 2
    const cy = posRef.current.y + MAP_H / 2
    const best = nearestCorner(cx, cy, w, h)
    snapTo(best)
  }, [getParentSize, snapTo])

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: MAP_W,
        height: MAP_H,
        borderRadius: RADIUS,
        background: 'rgba(12, 17, 29, 0.92)',
        border: '1px solid rgba(68, 76, 231, 0.3)',
        cursor: dragRef.current ? 'grabbing' : 'grab',
        zIndex: 50,
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        style={{ width: MAP_W, height: MAP_H, borderRadius: RADIUS, pointerEvents: 'none' }}
      />
    </div>
  )
}
