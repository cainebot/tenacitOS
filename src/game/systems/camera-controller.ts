import Phaser from 'phaser'

/**
 * Camera follow, zoom, and scroll-wheel control.
 *
 * Lifecycle: wheel listener registered via scene.input.on() — Phaser cleans
 * up the InputPlugin when the scene is destroyed. No manual teardown needed.
 */
export class CameraController {
  private cam: Phaser.Cameras.Scene2D.Camera

  constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Sprite,
    mapWidth: number,
    mapHeight: number,
  ) {
    this.cam = scene.cameras.main
    this.cam.setBounds(0, 0, mapWidth, mapHeight)
    this.cam.startFollow(target, true, 0.08, 0.08)
    this.cam.setZoom(2)

    // Zoom with scroll wheel
    scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.cam.zoom = Phaser.Math.Clamp(this.cam.zoom - dy * 0.002, 0.5, 4)
    })
  }
}
