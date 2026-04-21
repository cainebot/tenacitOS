import Phaser from 'phaser'
import { COLS, FRAMES_PER_DIR, DIR_INDEX, IDLE_ROW, WALK_ROW } from '../constants'

// ── Tooltip return type (eliminates setData/getData string-key coupling) ──

export interface TooltipResult {
  container: Phaser.GameObjects.Container
  width: number
  height: number
  text: Phaser.GameObjects.Text
}

// ── Animation factory ──

/** Create walk + idle animations for all 4 directions on a character spritesheet. */
export function createCharAnims(scene: Phaser.Scene, charKey: string): void {
  for (const dir of ['up', 'left', 'down', 'right'] as const) {
    const di = DIR_INDEX[dir]

    // Walk: Row 2, 6 frames per direction at 10fps
    const walkStart = WALK_ROW * COLS + di * FRAMES_PER_DIR
    if (!scene.anims.exists(`${charKey}_walk_${dir}`)) {
      scene.anims.create({
        key: `${charKey}_walk_${dir}`,
        frames: scene.anims.generateFrameNumbers(charKey, {
          start: walkStart,
          end: walkStart + FRAMES_PER_DIR - 1,
        }),
        frameRate: 10,
        repeat: -1,
      })
    }

    // Idle/Breath: Row 1, 6 frames per direction at 8fps
    const idleStart = IDLE_ROW * COLS + di * FRAMES_PER_DIR
    if (!scene.anims.exists(`${charKey}_idle_${dir}`)) {
      scene.anims.create({
        key: `${charKey}_idle_${dir}`,
        frames: scene.anims.generateFrameNumbers(charKey, {
          start: idleStart,
          end: idleStart + FRAMES_PER_DIR - 1,
        }),
        frameRate: 8,
        repeat: -1,
      })
    }
  }
}

// ── Tooltip factory ──

/** UUI-style tooltip: #0C111D rounded pill, white text, colored status dot, arrow. */
export function createTooltip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  dotColor: number,
): TooltipResult {
  const text = scene.add.text(0, 0, name, {
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
  const bg = scene.add.graphics()
  bg.fillStyle(0x0C111D, 0.92)
  bg.fillRoundedRect(0, 0, totalW, totalH, radius)

  // Position text inside
  text.setPosition(padX, padY)

  // Status dot (right side, vertically centered)
  const dot = scene.add.circle(
    totalW - padX - dotRadius,
    totalH / 2,
    dotRadius,
    dotColor,
  )

  // Arrow (small triangle pointing down)
  const arrow = scene.add.graphics()
  arrow.fillStyle(0x0C111D, 0.92)
  arrow.fillTriangle(
    totalW / 2 - 5, totalH,
    totalW / 2 + 5, totalH,
    totalW / 2, totalH + 5,
  )

  const container = scene.add.container(x - totalW / 2, y - totalH - 5, [bg, text, dot, arrow])
  container.setDepth(11)

  return { container, width: totalW, height: totalH, text }
}

/** Update tooltip text and recalculate pill dimensions in-place. */
export function updateTooltipText(
  tooltip: TooltipResult,
  newText: string,
  dotColor: number,
): void {
  const { container, text } = tooltip
  text.setText(newText)

  const padX = 14
  const padY = 10
  const dotRadius = 6
  const dotGap = 12
  const tw = text.width
  const th = text.height
  const totalW = padX + tw + dotGap + dotRadius * 2 + padX
  const totalH = padY + th + padY
  const radius = 12

  // Access children: [bg, text, dot, arrow]
  const bg = container.list[0] as Phaser.GameObjects.Graphics
  const dot = container.list[2] as Phaser.GameObjects.Arc
  const arrow = container.list[3] as Phaser.GameObjects.Graphics

  // Redraw background
  bg.clear()
  bg.fillStyle(0x0C111D, 0.92)
  bg.fillRoundedRect(0, 0, totalW, totalH, radius)

  // Reposition text
  text.setPosition(padX, padY)

  // Reposition dot
  dot.setPosition(totalW - padX - dotRadius, totalH / 2)
  dot.fillColor = dotColor

  // Redraw arrow
  arrow.clear()
  arrow.fillStyle(0x0C111D, 0.92)
  arrow.fillTriangle(
    totalW / 2 - 5, totalH,
    totalW / 2 + 5, totalH,
    totalW / 2, totalH + 5,
  )

  // Reposition container (keep centered on same X anchor)
  const oldCenterX = container.x + tooltip.width / 2
  container.x = oldCenterX - totalW / 2

  // Update cached dimensions
  tooltip.width = totalW
  tooltip.height = totalH
}
