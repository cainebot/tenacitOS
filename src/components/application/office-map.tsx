'use client'

import { useEffect, useRef } from 'react'

const TILESETS = [
  { mapName: 'room_builder',            key: 'ts_room_builder',   path: '/assets/tilesets/Room_Builder_Office_48x48.png' },
  { mapName: 'modern_office',           key: 'ts_modern_office',  path: '/assets/tilesets/Modern_Office_48x48.png' },
  { mapName: 'Classroom & Library',     key: 'ts_classroom',      path: '/assets/tilesets/5_Classroom_and_library_48x48.png' },
  { mapName: 'Basement',                key: 'ts_basement',       path: '/assets/tilesets/14_Basement_48x48.png' },
  { mapName: 'Generic Interiors',       key: 'ts_generic',        path: '/assets/tilesets/1_Generic_48x48.png' },
  { mapName: 'Interios Room Builder',   key: 'ts_room_builder_b', path: '/assets/tilesets/Room_Builder_48x48.png' },
  { mapName: '6_Music_and_sport_48x48', key: 'ts_music',          path: '/assets/tilesets/6_Music_and_sport_48x48.png' },
  { mapName: '3_Bathroom_48x48',        key: 'ts_bathroom',       path: '/assets/tilesets/3_Bathroom_48x48.png' },
  { mapName: '4_Bedroom_48x48',         key: 'ts_bedroom',        path: '/assets/tilesets/4_Bedroom_48x48.png' },
  { mapName: '2_LivingRoom_48x48',      key: 'ts_living',         path: '/assets/tilesets/2_LivingRoom_48x48.png' },
  { mapName: '7_Art_48x48',             key: 'ts_art',            path: '/assets/tilesets/7_Art_48x48.png' },
  { mapName: '8_Gym_48x48',             key: 'ts_gym',            path: '/assets/tilesets/8_Gym_48x48.png' },
  { mapName: '9_Fishing_48x48',         key: 'ts_fishing',        path: '/assets/tilesets/9_Fishing_48x48.png' },
  { mapName: '11_Halloween_48x48',      key: 'ts_halloween',      path: '/assets/tilesets/11_Halloween_48x48.png' },
  { mapName: '13_Conference_Hall_48x48',key: 'ts_conference',     path: '/assets/tilesets/13_Conference_Hall_48x48.png' },
  { mapName: '16_Grocery_store_48x48',  key: 'ts_grocery',        path: '/assets/tilesets/16_Grocery_store_48x48.png' },
]

const VISUAL_LAYERS = ['floor', 'walls', 'ground', 'furniture', 'objects', 'props', 'props-over', 'overhead']

// One character sprite per agent slot (7 available)
const CHAR_SPRITES = [
  { key: 'char_0', path: '/assets/characters/Premade_Character_48x48_01.png' },
  { key: 'char_1', path: '/assets/characters/Premade_Character_48x48_02.png' },
  { key: 'char_2', path: '/assets/characters/Premade_Character_48x48_03.png' },
  { key: 'char_3', path: '/assets/characters/Premade_Character_48x48_04.png' },
  { key: 'char_4', path: '/assets/characters/Premade_Character_48x48_05.png' },
  { key: 'char_5', path: '/assets/characters/Premade_Character_48x48_06.png' },
  { key: 'char_6', path: '/assets/characters/Premade_Character_48x48_09.png' },
]

// LPC extended sheet — walk rows start at 8 (not 0, which is spellcast)
// Row 8: walk up, 9: walk left, 10: walk down, 11: walk right
const FACING_ROW: Record<string, number> = { down: 10, left: 9, right: 11, up: 8 }

// Status → dot color
const STATUS_COLOR: Record<string, number> = {
  active:  0x12b76a,
  idle:    0xf79009,
  working: 0x12b76a,
}

interface AgentData {
  agent_id: string
  name: string
  status: string
}

export function OfficeMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    let game: { destroy: (b: boolean) => void; scale: { resize: (w: number, h: number) => void } } | null = null

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default

      class OfficeScene extends Phaser.Scene {
        constructor() { super({ key: 'OfficeScene' }) }

        preload() {
          this.load.tilemapTiledJSON('office', '/assets/maps/office2.json')
          for (const ts of TILESETS) this.load.image(ts.key, ts.path)
          for (const c of CHAR_SPRITES) {
            this.load.spritesheet(c.key, c.path, { frameWidth: 48, frameHeight: 48 })
          }
        }

        async create() {
          // ── Map layers ──
          const map = this.make.tilemap({ key: 'office' })
          const tilesets = TILESETS
            .map(ts => map.addTilesetImage(ts.mapName, ts.key))
            .filter((t): t is Phaser.Tilemaps.Tileset => t !== null)

          VISUAL_LAYERS.forEach((name, depth) => {
            const layer = map.createLayer(name, tilesets)
            if (layer) layer.setDepth(depth)
          })

          // ── Camera ──
          const cam = this.cameras.main
          cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
          cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)
          cam.setZoom(2)

          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return
            cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom
            cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom
          })

          this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
            cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.5, 4)
          })

          // ── Fetch agents ──
          let agents: AgentData[] = []
          try {
            const res = await fetch('/api/agents/list')
            if (res.ok) agents = await res.json()
          } catch {
            // no agents available — map still shows
          }

          if (agents.length === 0) return

          // ── Spawn points from map ──
          const spawnsLayer = map.getObjectLayer('spawns')
          const spawnPoints = spawnsLayer?.objects ?? []

          agents.slice(0, spawnPoints.length).forEach((agent, i) => {
            const spawn = spawnPoints[i]
            const spawnX = spawn.x ?? 0
            const spawnY = spawn.y ?? 0

            const facing = (
              spawn.properties?.find((p: { name: string }) => p.name === 'facing') as
                { value: string } | undefined
            )?.value ?? 'down'

            const row = FACING_ROW[facing] ?? 2
            const charKey = CHAR_SPRITES[i % CHAR_SPRITES.length].key
            // idle frame: col 4 of the facing row (center of 9-frame LPC walk cycle = standing neutral)
            const frame = row * 56 + 4

            // Character sprite
            const sprite = this.add.sprite(spawnX, spawnY, charKey, frame)
            sprite.setOrigin(0.5, 1)
            sprite.setDepth(10)

            // Name label
            this.add.text(spawnX, spawnY - 52, agent.name, {
              fontSize: '9px',
              color: '#ffffff',
              backgroundColor: '#00000099',
              padding: { x: 4, y: 2 },
              resolution: 2,
            }).setOrigin(0.5, 1).setDepth(11)

            // Status dot
            const dotColor = STATUS_COLOR[agent.status] ?? 0x667085
            this.add.circle(spawnX + 13, spawnY - 5, 4, dotColor).setDepth(12)
          })
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
