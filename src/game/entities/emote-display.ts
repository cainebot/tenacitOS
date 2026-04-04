import Phaser from 'phaser'

export const EMOTE_SPRITESHEET_KEY = 'emotes'
export const EMOTE_SPRITESHEET_PATH = '/assets/sprites/emotes_48x48.png'
const EMOTE_DEPTH = 15  // above agents (10+), below chat bubbles (20)
const DEFAULT_DURATION = 3000  // 3 seconds

/** Map emote names to spritesheet frame indices (10x10 grid, 48x48 per frame) */
export const EMOTE_FRAMES: Record<string, number> = {
  thinking: 20,    // exclamation/question mark row
  error: 40,       // X mark
  working: 30,     // tool/wrench icon
  happy: 0,        // smile/speech
  music: 52,       // music note
  heart: 22,       // heart
}

export class EmoteDisplay {
  private sprite: Phaser.GameObjects.Sprite
  private dismissTimer: Phaser.Time.TimerEvent | null = null
  private _destroyed = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    emoteName: string,
    duration: number = DEFAULT_DURATION,
  ) {
    const frameIndex = EMOTE_FRAMES[emoteName] ?? EMOTE_FRAMES.thinking

    this.sprite = scene.add.sprite(x, y, EMOTE_SPRITESHEET_KEY, frameIndex)
    this.sprite.setScale(1.0)  // 48px emotes, no scaling needed
    this.sprite.setDepth(EMOTE_DEPTH)
    this.sprite.setOrigin(0.5, 1)  // anchor at bottom center

    // Auto-dismiss
    if (duration > 0) {
      this.dismissTimer = scene.time.delayedCall(duration, () => {
        this.dismiss()
      })
    }
  }

  updatePosition(x: number, y: number): void {
    if (this._destroyed) return
    this.sprite.setPosition(x, y)
  }

  dismiss(): void {
    if (this._destroyed) return
    this._destroyed = true
    if (this.dismissTimer) {
      this.dismissTimer.destroy()
      this.dismissTimer = null
    }
    this.sprite.destroy()
  }

  get isDestroyed(): boolean {
    return this._destroyed
  }
}
