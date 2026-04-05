import type { ZoneBinding } from '@/features/office/types'

const BRAND_COLOR = '#444CE7'
const DOT_RADIUS = 8
const OVERLAY_DEPTH = 5

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '10px',
  color: '#ffffff',
  fontFamily: 'Inter',
  shadow: {
    offsetX: 1,
    offsetY: 1,
    color: '#000000',
    blur: 2,
    fill: true,
  },
}

function hexToNumber(hex: string): number {
  const clean = hex.replace('#', '')
  return parseInt(clean, 16)
}

export class BindingOverlayRenderer {
  private scene: Phaser.Scene
  private tileSize: number
  private dots: Map<string, Phaser.GameObjects.Graphics> = new Map()
  private labels: Map<string, Phaser.GameObjects.Text> = new Map()

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene
    this.tileSize = tileSize
  }

  render(bindings: ZoneBinding[]): void {
    // Clear existing overlays
    this.destroy()

    for (const binding of bindings) {
      if (!binding.label) continue

      const px = binding.grid_x * this.tileSize + this.tileSize / 2
      const py = binding.grid_y * this.tileSize

      const color = hexToNumber(binding.color ?? BRAND_COLOR)

      // ── Colored dot ──
      const dot = this.scene.add.graphics()
      dot.fillStyle(color, 1)
      dot.fillCircle(0, 0, DOT_RADIUS)
      dot.setPosition(px, py)
      dot.setDepth(OVERLAY_DEPTH)
      this.dots.set(binding.binding_id, dot)

      // ── Floating label above dot ──
      const label = this.scene.add.text(px, py - 12, binding.label, LABEL_STYLE)
      label.setOrigin(0.5, 1)
      label.setDepth(OVERLAY_DEPTH)
      this.labels.set(binding.binding_id, label)
    }
  }

  update(bindings: ZoneBinding[]): void {
    const incoming = new Map<string, ZoneBinding>()
    for (const b of bindings) {
      incoming.set(b.binding_id, b)
    }

    // Remove stale overlays (present in current, absent in incoming)
    for (const id of this.dots.keys()) {
      if (!incoming.has(id)) {
        this.dots.get(id)?.destroy()
        this.dots.delete(id)
        this.labels.get(id)?.destroy()
        this.labels.delete(id)
      }
    }

    // Add or update bindings
    for (const [id, binding] of incoming) {
      if (!binding.label) {
        // No label — remove if exists
        if (this.dots.has(id)) {
          this.dots.get(id)?.destroy()
          this.dots.delete(id)
          this.labels.get(id)?.destroy()
          this.labels.delete(id)
        }
        continue
      }

      const px = binding.grid_x * this.tileSize + this.tileSize / 2
      const py = binding.grid_y * this.tileSize
      const color = hexToNumber(binding.color ?? BRAND_COLOR)

      if (this.dots.has(id)) {
        // Update existing: reposition + recolor
        const dot = this.dots.get(id)!
        dot.clear()
        dot.fillStyle(color, 1)
        dot.fillCircle(0, 0, DOT_RADIUS)
        dot.setPosition(px, py)

        const label = this.labels.get(id)!
        label.setText(binding.label)
        label.setPosition(px, py - 12)
      } else {
        // Add new
        const dot = this.scene.add.graphics()
        dot.fillStyle(color, 1)
        dot.fillCircle(0, 0, DOT_RADIUS)
        dot.setPosition(px, py)
        dot.setDepth(OVERLAY_DEPTH)
        this.dots.set(id, dot)

        const label = this.scene.add.text(px, py - 12, binding.label, LABEL_STYLE)
        label.setOrigin(0.5, 1)
        label.setDepth(OVERLAY_DEPTH)
        this.labels.set(id, label)
      }
    }
  }

  destroy(): void {
    for (const dot of this.dots.values()) {
      dot.destroy()
    }
    this.dots.clear()

    for (const label of this.labels.values()) {
      label.destroy()
    }
    this.labels.clear()
  }
}
