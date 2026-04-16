'use client'

import { useEffect, useRef } from 'react'
import { useOfficeStore } from '@/features/office/stores/office-store'
import { buildManifest } from './asset-manifest'

export function BuilderBridge() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<{ destroy: (b: boolean) => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    // StrictMode guard: track if this effect was cleaned up before
    // the async initPhaser completes. Without this, two Phaser games
    // get created and the first one's stale update() overwrites state.
    let cancelled = false

    // Signal BootScene to start BuilderScene instead of OfficeScene
    ;(globalThis as any).__circos_target_scene = 'BuilderScene'

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      if (cancelled) return

      const { BootScene } = await import('./scenes/boot-scene')
      const { BuilderScene } = await import('./scenes/builder-scene')
      if (cancelled) return

      // Build manifest from current map document (or null for defaults)
      const mapDoc = useOfficeStore.getState().mapDocument
      const manifest = buildManifest(mapDoc)
      ;(globalThis as any).__circos_manifest = manifest

      // Destroy any leftover game from a previous mount
      gameRef.current?.destroy(true)

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: '#0f1117',
        scene: [BootScene, BuilderScene],
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
      // Clean up globalThis references
      delete (globalThis as any).__circos_manifest
      delete (globalThis as any).__circos_target_scene
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  )
}
