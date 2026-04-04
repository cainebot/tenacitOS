'use client'

import { useEffect, useRef } from 'react'

export function OfficeMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    let game: { destroy: (b: boolean) => void; scale: { resize: (w: number, h: number) => void } } | null = null

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default

      // ── Asset configuration ──
      const TILESET = {
        mapName: 'map_centered_tileset_64x64',
        key: 'ts_office_v3',
        path: '/assets/tilesets/office-v3-tileset.png',
      }

      const CHAR_SPRITES = [
        { key: 'char_0', path: '/assets/characters/Premade_Character_48x48_01.png' },
        { key: 'char_1', path: '/assets/characters/Premade_Character_48x48_02.png' },
        { key: 'char_2', path: '/assets/characters/Premade_Character_48x48_03.png' },
        { key: 'char_3', path: '/assets/characters/Premade_Character_48x48_04.png' },
        { key: 'char_4', path: '/assets/characters/Premade_Character_48x48_05.png' },
        { key: 'char_5', path: '/assets/characters/Premade_Character_48x48_06.png' },
        { key: 'char_6', path: '/assets/characters/Premade_Character_48x48_09.png' },
      ]

      const DEMO_AGENTS = [
        { agent_id: 'pomni', name: 'Pomni', status: 'active' },
        { agent_id: 'kinger', name: 'Kinger', status: 'working' },
        { agent_id: 'ragatha', name: 'Ragatha', status: 'active' },
        { agent_id: 'jax', name: 'Jax', status: 'idle' },
        { agent_id: 'gangle', name: 'Gangle', status: 'working' },
        { agent_id: 'kaufmo', name: 'Kaufmo', status: 'active' },
        { agent_id: 'zooble', name: 'Zooble', status: 'idle' },
      ]

      // Spawn positions inside the main office building (spread across rooms)
      const SPAWN_POSITIONS = [
        { tileX: 48, tileY: 42, facing: 'down' },   // Left work area
        { tileX: 58, tileY: 38, facing: 'right' },   // Central lobby upper
        { tileX: 68, tileY: 42, facing: 'left' },    // Central lobby right
        { tileX: 42, tileY: 55, facing: 'down' },    // Bottom-left room
        { tileX: 90, tileY: 38, facing: 'down' },    // Right wing upper
        { tileX: 55, tileY: 60, facing: 'right' },   // Bottom center
        { tileX: 82, tileY: 55, facing: 'left' },    // Bottom-right room
      ]

      const STATUS_COLOR: Record<string, number> = {
        active: 0x12b76a,
        idle: 0xf79009,
        working: 0x12b76a,
      }

      // LPC spritesheet: row 8-11 = walk (up/left/down/right)
      const FACING_ROW: Record<string, number> = { down: 10, left: 9, right: 11, up: 8 }

      class OfficeScene extends Phaser.Scene {
        private isDragging = false

        constructor() { super({ key: 'OfficeScene' }) }

        preload() {
          this.load.tilemapTiledJSON('office', '/assets/maps/office-v3.json')
          this.load.image(TILESET.key, TILESET.path)
          for (const c of CHAR_SPRITES) {
            this.load.spritesheet(c.key, c.path, { frameWidth: 48, frameHeight: 48 })
          }
        }

        async create() {
          try { await this._create() } catch (e) { console.error('[OfficeScene] create failed:', e) }
        }

        private async _create() {
          // ── Tilemap ──
          const map = this.make.tilemap({ key: 'office' })
          console.log('[Office] map:', map.width, 'x', map.height, 'tile:', map.tileWidth, 'x', map.tileHeight)

          const tileset = map.addTilesetImage(TILESET.mapName, TILESET.key)
          if (!tileset) {
            console.error('[Office] tileset FAILED:', TILESET.mapName)
            return
          }
          console.log('[Office] tileset loaded:', tileset.name)

          const groundLayer = map.createLayer('ground', tileset)
          if (!groundLayer) {
            console.error('[Office] ground layer FAILED')
            return
          }
          groundLayer.setDepth(0)

          console.log('[Office] map px:', map.widthInPixels, 'x', map.heightInPixels)

          // ── Camera ──
          const cam = this.cameras.main
          cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
          cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)

          const zoomX = this.scale.width / map.widthInPixels
          const zoomY = this.scale.height / map.heightInPixels
          cam.setZoom(Math.max(zoomX, zoomY) * 0.95)

          this.setupCameraControls(cam)

          // ── Fetch agents ──
          let agents: { agent_id: string; name: string; status: string }[] = []
          try {
            const res = await fetch('/api/agents/list')
            if (res.ok) agents = await res.json()
          } catch { /* fallback */ }
          if (agents.length === 0) agents = DEMO_AGENTS

          // ── Spawn agents ──
          const tileSize = map.tileWidth
          const count = Math.min(agents.length, SPAWN_POSITIONS.length, CHAR_SPRITES.length)
          for (let i = 0; i < count; i++) {
            const spawn = SPAWN_POSITIONS[i]
            const px = spawn.tileX * tileSize + tileSize / 2
            const py = spawn.tileY * tileSize + tileSize / 2

            const facing = spawn.facing
            const row = FACING_ROW[facing] ?? 10
            const charKey = CHAR_SPRITES[i].key
            const frame = row * 56 + 4

            // Scale 48px sprites to match 64px tiles (64/48 = 1.33)
            const spriteScale = 64 / 48

            const sprite = this.add.sprite(px, py, charKey, frame)
            sprite.setOrigin(0.5, 1)
            sprite.setScale(spriteScale)
            sprite.setDepth(10)

            this.add.text(px, py - 70, agents[i].name, {
              fontSize: '10px',
              fontFamily: 'Inter, sans-serif',
              color: '#ffffff',
              backgroundColor: '#181D27cc',
              padding: { x: 5, y: 2 },
              resolution: 2,
            }).setOrigin(0.5, 1).setDepth(11)

            const dotColor = STATUS_COLOR[agents[i].status] ?? 0x667085
            const dot = this.add.circle(px + 18, py - 8, 5, dotColor)
            dot.setStrokeStyle(1.5, 0x181d27)
            dot.setDepth(12)
          }
        }

        private setupCameraControls(cam: Phaser.Cameras.Scene2D.Camera) {
          this.input.on('pointerdown', () => { this.isDragging = false })

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return
            const dx = pointer.x - pointer.prevPosition.x
            const dy = pointer.y - pointer.prevPosition.y
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.isDragging = true
            cam.scrollX -= dx / cam.zoom
            cam.scrollY -= dy / cam.zoom
          })

          this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
            cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.002, 0.3, 4)
          })

          const cursors = this.input.keyboard?.createCursorKeys()
          if (cursors) {
            this.events.on('update', () => {
              const speed = 4 / cam.zoom
              if (cursors.left.isDown) cam.scrollX -= speed
              if (cursors.right.isDown) cam.scrollX += speed
              if (cursors.up.isDown) cam.scrollY -= speed
              if (cursors.down.isDown) cam.scrollY += speed
            })
          }
        }
      }

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
        scale: { mode: Phaser.Scale.NONE },
      }) as typeof game

      gameRef.current = game
    }

    initPhaser()

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (gameRef.current) {
        (gameRef.current as { scale: { resize: (w: number, h: number) => void } }).scale.resize(width, height)
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      game?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: 'grab' }}
    />
  )
}
