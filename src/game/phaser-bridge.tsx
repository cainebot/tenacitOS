'use client'

import { useEffect, useRef } from 'react'
import { snapshot, notifySubscribers } from './state-snapshot'

export function PhaserBridge() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<{ destroy: (b: boolean) => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    // StrictMode guard: track if this effect was cleaned up before
    // the async initPhaser completes. Without this, two Phaser games
    // get created and the first one's stale update() overwrites the snapshot.
    let cancelled = false

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      if (cancelled) return

      const { OfficeScene } = await import('./scenes/office-scene')
      if (cancelled) return

      // Destroy any leftover game from a previous mount
      gameRef.current?.destroy(true)

      const game = new Phaser.Game({
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
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
      snapshot.lifecycle = 'destroyed'
      notifySubscribers()
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
