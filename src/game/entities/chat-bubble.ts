import Phaser from 'phaser'

const DEFAULT_DURATION = 5000  // 5 seconds auto-dismiss
const BUBBLE_DEPTH = 20       // above all sprites (max agent depth ~16)

export class ChatBubble {
  private container: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private text: Phaser.GameObjects.Text
  private tail: Phaser.GameObjects.Graphics
  private dismissTimer: Phaser.Time.TimerEvent | null = null
  private _destroyed = false
  private _totalW = 0
  private _totalH = 0

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    message: string,
    duration: number = DEFAULT_DURATION,
  ) {
    // Text with word wrap (max 160px width)
    this.text = scene.add.text(0, 0, message, {
      fontSize: '18px',
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff',
      wordWrap: { width: 160 },
      resolution: 2,
    })
    this.text.setOrigin(0, 0)

    const padX = 12
    const padY = 8
    const tw = this.text.width
    const th = this.text.height
    const totalW = padX + tw + padX
    const totalH = padY + th + padY
    const radius = 10

    // Rounded rect background (dark pill, same as tooltip)
    this.bg = scene.add.graphics()
    this.bg.fillStyle(0x0C111D, 0.92)
    this.bg.fillRoundedRect(0, 0, totalW, totalH, radius)

    // Position text inside bg
    this.text.setPosition(padX, padY)

    // Tail triangle pointing down toward agent
    this.tail = scene.add.graphics()
    this.tail.fillStyle(0x0C111D, 0.92)
    this.tail.fillTriangle(
      totalW / 2 - 5, totalH,
      totalW / 2 + 5, totalH,
      totalW / 2, totalH + 6,
    )

    // Store dimensions for updatePosition
    this._totalW = totalW
    this._totalH = totalH

    // Container centered above the agent
    this.container = scene.add.container(
      x - totalW / 2,
      y - totalH - 6,
      [this.bg, this.text, this.tail],
    )
    this.container.setDepth(BUBBLE_DEPTH)

    // Auto-dismiss timer
    if (duration > 0) {
      this.dismissTimer = scene.time.delayedCall(duration, () => {
        this.dismiss()
      })
    }
  }

  updatePosition(x: number, y: number): void {
    if (this._destroyed) return
    this.container.setPosition(x - this._totalW / 2, y - this._totalH - 6)
  }

  dismiss(): void {
    if (this._destroyed) return
    this._destroyed = true
    if (this.dismissTimer) {
      this.dismissTimer.destroy()
      this.dismissTimer = null
    }
    this.container.destroy()
  }

  get isDestroyed(): boolean {
    return this._destroyed
  }
}
