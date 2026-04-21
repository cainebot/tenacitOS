import Phaser from 'phaser'
import { buildManifest, type AssetManifest } from '../asset-manifest'

export class BootScene extends Phaser.Scene {
  private manifest!: AssetManifest

  constructor() {
    super({ key: 'BootScene' })
  }

  init() {
    this.manifest =
      (globalThis as any).__circos_manifest ?? buildManifest(null)
  }

  preload() {
    // ── Progress bar ──
    const { width, height } = this.cameras.main
    const barW = Math.min(width * 0.4, 300)
    const barH = 8
    const barX = (width - barW) / 2
    const barY = height / 2

    const bgBar = this.add.graphics()
    bgBar.fillStyle(0x1d2939, 1) // dark background
    bgBar.fillRoundedRect(barX, barY, barW, barH, 4)

    const fillBar = this.add.graphics()
    this.load.on('progress', (value: number) => {
      fillBar.clear()
      fillBar.fillStyle(0x444ce7, 1) // brand indigo
      fillBar.fillRoundedRect(barX, barY, barW * value, barH, 4)
    })

    // ── Load all assets from manifest ──
    this.load.tilemapTiledJSON(
      this.manifest.tilemap.key,
      this.manifest.tilemap.url,
    )

    for (const ts of this.manifest.tilesets) {
      this.load.image(ts.key, ts.url)
    }

    for (const ss of this.manifest.spritesheets) {
      this.load.spritesheet(ss.key, ss.url, {
        frameWidth: ss.frameWidth,
        frameHeight: ss.frameHeight,
      })
    }
  }

  create() {
    const target = (globalThis as any).__circos_target_scene ?? 'OfficeScene'
    this.scene.start(target)
  }
}
