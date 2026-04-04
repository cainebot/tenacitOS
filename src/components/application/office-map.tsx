'use client'

import { useEffect, useRef } from 'react'
import officeEvents from '@/lib/office-events'

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

      // Player uses char_0, agents use char_1..char_6
      const PLAYER_SPRITE = { key: 'player', path: '/assets/characters/Premade_Character_48x48_01.png' }

      const CHAR_SPRITES = [
        { key: 'char_1', path: '/assets/characters/Premade_Character_48x48_02.png' },
        { key: 'char_2', path: '/assets/characters/Premade_Character_48x48_03.png' },
        { key: 'char_3', path: '/assets/characters/Premade_Character_48x48_04.png' },
        { key: 'char_4', path: '/assets/characters/Premade_Character_48x48_05.png' },
        { key: 'char_5', path: '/assets/characters/Premade_Character_48x48_06.png' },
        { key: 'char_6', path: '/assets/characters/Premade_Character_48x48_09.png' },
      ]

      const DEMO_AGENTS = [
        { agent_id: 'pomni', name: 'Pomni', role: 'Scrum Master', status: 'active' },
        { agent_id: 'kinger', name: 'Kinger', role: 'Prospector', status: 'working' },
        { agent_id: 'ragatha', name: 'Ragatha', role: 'Copywriter', status: 'active' },
        { agent_id: 'jax', name: 'Jax', role: 'Qualifier', status: 'idle' },
        { agent_id: 'gangle', name: 'Gangle', role: 'Enricher', status: 'working' },
        { agent_id: 'kaufmo', name: 'Kaufmo', role: 'Developer', status: 'active' },
        { agent_id: 'zooble', name: 'Zooble', role: 'Analyst', status: 'idle' },
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

      // Player spawn at central lobby
      const PLAYER_SPAWN = { tileX: 63, tileY: 48, facing: 'down' as const }

      const STATUS_COLOR: Record<string, number> = {
        active: 0x12b76a,    // green
        idle: 0x667085,      // grey
        working: 0xf79009,   // orange (busy)
        busy: 0xf79009,      // orange
        error: 0xf04438,     // red
        offline: 0xf04438,   // red
      }

      // LimeZu spritesheet format (48x96 frames, 56 cols per row)
      // Directions packed within each row: right(6), up(6), left(6), down(6)
      const COLS = 56
      const FRAMES_PER_DIR = 6
      const DIR_INDEX: Record<string, number> = { right: 0, up: 1, left: 2, down: 3 }
      const IDLE_ROW = 1  // Row 1 = idle/breath animations
      const WALK_ROW = 2  // Row 2 = walk animations
      const SPRITE_SCALE = 2.0

      const PLAYER_SPEED = 360 // pixels per second

      class OfficeScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Sprite
        private playerLabel!: Phaser.GameObjects.Container
        private playerFacing = 'down'
        private playerMoving = false
        private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
        private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

        constructor() { super({ key: 'OfficeScene' }) }

        preload() {
          this.load.tilemapTiledJSON('office', '/assets/maps/office-v3.json')
          this.load.image(TILESET.key, TILESET.path)
          this.load.spritesheet(PLAYER_SPRITE.key, PLAYER_SPRITE.path, { frameWidth: 48, frameHeight: 96 })
          for (const c of CHAR_SPRITES) {
            this.load.spritesheet(c.key, c.path, { frameWidth: 48, frameHeight: 96 })
          }
        }

        async create() {
          try { await this._create() } catch (e) { console.error('[OfficeScene] create failed:', e) }
        }

        private createCharAnims(charKey: string) {
          for (const dir of ['up', 'left', 'down', 'right'] as const) {
            const di = DIR_INDEX[dir]

            // Walk: Row 2, 6 frames per direction at 10fps
            const walkStart = WALK_ROW * COLS + di * FRAMES_PER_DIR
            if (!this.anims.exists(`${charKey}_walk_${dir}`)) {
              this.anims.create({
                key: `${charKey}_walk_${dir}`,
                frames: this.anims.generateFrameNumbers(charKey, {
                  start: walkStart,
                  end: walkStart + FRAMES_PER_DIR - 1,
                }),
                frameRate: 10,
                repeat: -1,
              })
            }

            // Idle/Breath: Row 1, 6 frames per direction at 8fps
            const idleStart = IDLE_ROW * COLS + di * FRAMES_PER_DIR
            if (!this.anims.exists(`${charKey}_idle_${dir}`)) {
              this.anims.create({
                key: `${charKey}_idle_${dir}`,
                frames: this.anims.generateFrameNumbers(charKey, {
                  start: idleStart,
                  end: idleStart + FRAMES_PER_DIR - 1,
                }),
                frameRate: 8,
                repeat: -1,
              })
            }
          }
        }

        private async _create() {
          // ── Tilemap ──
          const map = this.make.tilemap({ key: 'office' })
          const tileset = map.addTilesetImage(TILESET.mapName, TILESET.key)
          if (!tileset) { console.error('[Office] tileset FAILED'); return }

          const groundLayer = map.createLayer('ground', tileset)
          if (!groundLayer) { console.error('[Office] ground layer FAILED'); return }
          groundLayer.setDepth(0)

          const tileSize = map.tileWidth

          // ── Camera ──
          const cam = this.cameras.main
          cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

          // ── Player ──
          this.createCharAnims(PLAYER_SPRITE.key)
          const playerX = PLAYER_SPAWN.tileX * tileSize + tileSize / 2
          const playerY = PLAYER_SPAWN.tileY * tileSize + tileSize / 2

          this.player = this.add.sprite(playerX, playerY, PLAYER_SPRITE.key)
          this.player.setOrigin(0.5, 1)
          this.player.setScale(SPRITE_SCALE)
          this.player.setDepth(10)
          this.player.play(`${PLAYER_SPRITE.key}_idle_down`)

          // Player name label (follows player) — UUI tooltip style
          this.playerLabel = this.createTooltip(playerX, playerY - (72 * SPRITE_SCALE) - 8, 'You', 0x12b76a)
          this.updatePlayerLabel()

          // Camera follows player
          cam.startFollow(this.player, true, 0.08, 0.08)
          cam.setZoom(2)

          // ── Input ──
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = {
            W: this.input.keyboard!.addKey('W'),
            A: this.input.keyboard!.addKey('A'),
            S: this.input.keyboard!.addKey('S'),
            D: this.input.keyboard!.addKey('D'),
          }

          // Zoom with scroll wheel
          this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
            cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.002, 0.5, 4)
          })

          // ── Fetch agents ──
          let agents: { agent_id: string; name: string; role?: string; status: string }[] = []
          try {
            const res = await fetch('/api/agents/list')
            if (res.ok) agents = await res.json()
          } catch { /* fallback */ }
          if (agents.length === 0) agents = DEMO_AGENTS

          // ── Spawn agents ──
          const count = Math.min(agents.length, SPAWN_POSITIONS.length, CHAR_SPRITES.length)
          for (let i = 0; i < count; i++) {
            const spawn = SPAWN_POSITIONS[i]
            const px = spawn.tileX * tileSize + tileSize / 2
            const py = spawn.tileY * tileSize + tileSize / 2

            const facing = spawn.facing as keyof typeof DIR_INDEX
            const charKey = CHAR_SPRITES[i].key
            const standingFrame = IDLE_ROW * COLS + (DIR_INDEX[facing] ?? 3) * FRAMES_PER_DIR

            this.createCharAnims(charKey)

            // ── Sprite ──
            const sprite = this.add.sprite(px, py, charKey, standingFrame)
            sprite.setOrigin(0.5, 1)
            sprite.setScale(SPRITE_SCALE)
            sprite.setDepth(10)
            sprite.play(`${charKey}_idle_${facing}`)

            // ── Click handler ──
            sprite.setInteractive({ cursor: 'pointer' })
            sprite.on('pointerdown', () => {
              officeEvents.emit('agent:select', {
                agent_id: agents[i].agent_id,
                name: agents[i].name,
                role: agents[i].role ?? 'Agent',
                status: agents[i].status,
              })
            })

            // ── UUI-style tooltip: name + status dot ──
            const labelY = py - (72 * SPRITE_SCALE) - 8
            const dotColor = STATUS_COLOR[agents[i].status] ?? 0x667085
            this.createTooltip(px, labelY, agents[i].name, dotColor)
          }
        }

        /** UUI-style tooltip: #0C111D rounded pill, white text, colored dot right */
        private createTooltip(x: number, y: number, name: string, dotColor: number): Phaser.GameObjects.Container {
          const text = this.add.text(0, 0, name, {
            fontSize: '20px',
            fontFamily: 'Inter, sans-serif',
            fontStyle: '600',
            color: '#ffffff',
            resolution: 2,
          })
          text.setOrigin(0, 0)

          const padX = 14
          const padY = 10
          const dotRadius = 6
          const dotGap = 12
          const tw = text.width
          const th = text.height
          const totalW = padX + tw + dotGap + dotRadius * 2 + padX
          const totalH = padY + th + padY
          const radius = 12

          // Rounded rect background
          const bg = this.add.graphics()
          bg.fillStyle(0x0C111D, 0.92)
          bg.fillRoundedRect(0, 0, totalW, totalH, radius)

          // Position text inside
          text.setPosition(padX, padY)

          // Status dot (right side, vertically centered)
          const dot = this.add.circle(
            totalW - padX - dotRadius,
            totalH / 2,
            dotRadius,
            dotColor,
          )

          // Arrow (small triangle pointing down)
          const arrow = this.add.graphics()
          arrow.fillStyle(0x0C111D, 0.92)
          arrow.fillTriangle(
            totalW / 2 - 5, totalH,
            totalW / 2 + 5, totalH,
            totalW / 2, totalH + 5,
          )

          const container = this.add.container(x - totalW / 2, y - totalH - 5, [bg, text, dot, arrow])
          container.setDepth(11)
          container.setData('tooltipW', totalW)
          container.setData('tooltipH', totalH)
          return container
        }

        private updatePlayerLabel() {
          if (!this.player || !this.playerLabel) return
          const tw = this.playerLabel.getData('tooltipW') as number
          const th = this.playerLabel.getData('tooltipH') as number
          this.playerLabel.setPosition(
            this.player.x - tw / 2,
            this.player.y - (72 * SPRITE_SCALE) - 8 - th - 5,
          )
        }

        update(_time: number, delta: number) {
          if (!this.player || !this.cursors) return

          const speed = PLAYER_SPEED * (delta / 1000)

          // Read input (WASD + arrows)
          const left = this.cursors.left.isDown || this.wasd.A.isDown
          const right = this.cursors.right.isDown || this.wasd.D.isDown
          const up = this.cursors.up.isDown || this.wasd.W.isDown
          const down = this.cursors.down.isDown || this.wasd.S.isDown

          let vx = 0
          let vy = 0
          if (left) vx -= 1
          if (right) vx += 1
          if (up) vy -= 1
          if (down) vy += 1

          // Normalize diagonal movement
          if (vx !== 0 && vy !== 0) {
            const diag = Math.SQRT1_2
            vx *= diag
            vy *= diag
          }

          const isMoving = vx !== 0 || vy !== 0

          if (isMoving) {
            this.player.x += vx * speed
            this.player.y += vy * speed

            // Determine facing direction (horizontal priority on diagonals, like Agent Town)
            let newFacing = this.playerFacing
            if (vx < 0) newFacing = 'left'
            else if (vx > 0) newFacing = 'right'
            else if (vy < 0) newFacing = 'up'
            else if (vy > 0) newFacing = 'down'

            const walkKey = `${PLAYER_SPRITE.key}_walk_${newFacing}`
            if (this.player.anims.currentAnim?.key !== walkKey) {
              this.playerFacing = newFacing
              this.player.play(walkKey)
            }
            this.playerMoving = true
          } else {
            // Idle/breath animation
            const idleKey = `${PLAYER_SPRITE.key}_idle_${this.playerFacing}`
            if (this.player.anims.currentAnim?.key !== idleKey) {
              this.player.play(idleKey)
            }
            this.playerMoving = false
          }

          // Y-sort depth so player walks behind/in front of objects
          this.player.setDepth(10 + this.player.y * 0.001)

          // Update label position
          this.updatePlayerLabel()
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
        scale: { mode: Phaser.Scale.RESIZE },
      }) as typeof game

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
