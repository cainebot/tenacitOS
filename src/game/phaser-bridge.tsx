'use client'

import { useEffect, useRef } from 'react'

export function PhaserBridge() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<{ destroy: (b: boolean) => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    let game: { destroy: (b: boolean) => void } | null = null

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      const { OfficeScene } = await import('./scenes/office-scene')

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: '#0f1117',
        scene: [OfficeScene],
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scale: { mode: Phaser.Scale.RESIZE },
      })

      gameRef.current = game
    }

    initPhaser()

    return () => {
      game?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: 'default' }}
    />
  )
}
