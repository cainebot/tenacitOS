import Phaser from 'phaser'
import { PLAYER_SPRITE, PLAYER_SPAWN, SPRITE_SCALE, PLAYER_SPEED } from '../constants'
import { createCharAnims, createTooltip, type TooltipResult } from '../utils/sprite-factory'
import type { NavGrid } from '../pathfinding/nav-grid'

/**
 * The local player character with WASD/arrow movement.
 *
 * Lifecycle: cursors + WASD keys are registered via scene.input.keyboard —
 * Phaser cleans up the Keyboard plugin when the scene is destroyed.
 */
export class PlayerSprite {
  readonly sprite: Phaser.GameObjects.Sprite
  private label: Phaser.GameObjects.Container
  private labelW: number
  private labelH: number
  private _facing: string
  private _moving = false
  private navGrid: NavGrid | null = null
  private tileSize: number

  get currentFacing(): string { return this._facing }
  get isMoving(): boolean { return this._moving }
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor(
    scene: Phaser.Scene,
    tileSize: number,
    spawn?: { gridX: number; gridY: number; facing: string },
  ) {
    const spawnX = spawn?.gridX ?? PLAYER_SPAWN.tileX
    const spawnY = spawn?.gridY ?? PLAYER_SPAWN.tileY
    const spawnFacing = spawn?.facing ?? PLAYER_SPAWN.facing
    this._facing = spawnFacing
    this.tileSize = tileSize

    const px = spawnX * tileSize + tileSize / 2
    const py = spawnY * tileSize + tileSize / 2

    createCharAnims(scene, PLAYER_SPRITE.key)

    this.sprite = scene.add.sprite(px, py, PLAYER_SPRITE.key)
    this.sprite.setOrigin(0.5, 1)
    this.sprite.setScale(SPRITE_SCALE)
    this.sprite.setDepth(10)
    this.sprite.play(`${PLAYER_SPRITE.key}_idle_${spawnFacing}`)

    // Tooltip (typed — no string-key getData)
    const tooltip = createTooltip(scene, px, py - (72 * SPRITE_SCALE) - 8, 'You', 0x12b76a)
    this.label = tooltip.container
    this.labelW = tooltip.width
    this.labelH = tooltip.height
    this.updateLabel()
  }

  setNavGrid(navGrid: NavGrid): void {
    this.navGrid = navGrid
  }

  setupInput(scene: Phaser.Scene): void {
    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = {
      W: scene.input.keyboard!.addKey('W'),
      A: scene.input.keyboard!.addKey('A'),
      S: scene.input.keyboard!.addKey('S'),
      D: scene.input.keyboard!.addKey('D'),
    }
  }

  update(delta: number): void {
    // Skip movement when a text input is focused (chat, search, etc.)
    const active = document.activeElement
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
      const idleKey = `${PLAYER_SPRITE.key}_idle_${this._facing}`
      if (this.sprite.anims.currentAnim?.key !== idleKey) {
        this.sprite.play(idleKey)
      }
      this._moving = false
      return
    }

    const speed = PLAYER_SPEED * (delta / 1000)

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
      let nextX = this.sprite.x + vx * speed
      let nextY = this.sprite.y + vy * speed

      // Collision check against navGrid blocked cells
      // Check feet cell AND body cell (1 tile above feet) to prevent
      // the character from visually overlapping blocked areas.
      if (this.navGrid) {
        const ts = this.tileSize
        const canWalk = (x: number, y: number) => {
          const footCol = Math.floor(x / ts)
          const footRow = Math.floor(y / ts)
          const bodyRow = footRow - 1 // torso = 1 tile above feet
          return this.navGrid!.isWalkable(footCol, footRow)
            && this.navGrid!.isWalkable(footCol, bodyRow)
        }

        if (!canWalk(nextX, nextY)) {
          // Try sliding along axes individually
          if (canWalk(nextX, this.sprite.y)) {
            nextY = this.sprite.y // block Y, allow X
          } else if (canWalk(this.sprite.x, nextY)) {
            nextX = this.sprite.x // block X, allow Y
          } else {
            nextX = this.sprite.x // block both
            nextY = this.sprite.y
          }
        }
      }

      this.sprite.x = nextX
      this.sprite.y = nextY

      // Facing direction (horizontal priority on diagonals, Agent Town style)
      let newFacing = this._facing
      if (vx < 0) newFacing = 'left'
      else if (vx > 0) newFacing = 'right'
      else if (vy < 0) newFacing = 'up'
      else if (vy > 0) newFacing = 'down'

      const walkKey = `${PLAYER_SPRITE.key}_walk_${newFacing}`
      if (this.sprite.anims.currentAnim?.key !== walkKey) {
        this._facing = newFacing
        this.sprite.play(walkKey)
      }
      this._moving = true
    } else {
      const idleKey = `${PLAYER_SPRITE.key}_idle_${this._facing}`
      if (this.sprite.anims.currentAnim?.key !== idleKey) {
        this.sprite.play(idleKey)
      }
      this._moving = false
    }

    // Y-sort depth
    this.sprite.setDepth(10 + this.sprite.y * 0.001)

    this.updateLabel()
  }

  private updateLabel(): void {
    this.label.setPosition(
      this.sprite.x - this.labelW / 2,
      this.sprite.y - (72 * SPRITE_SCALE) - 8 - this.labelH - 5,
    )
  }
}
