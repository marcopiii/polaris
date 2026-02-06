import Phaser from 'phaser';
import { PLAYER_SIZE, FIRE_COOLDOWN, COLORS } from '../constants';
import { angleBetween } from '../utils/MathUtils';

export default class Player {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  public x: number;
  public y: number;
  private rotation: number = 0;
  private shootCooldown: number = 0;
  private isShooting: boolean = false;
  private scale: number = 1.0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Create graphics
    this.graphics = scene.add.graphics();
    this.draw();

    // Set up input
    this.setupInput();
  }

  private setupInput() {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.rotation = angleBetween(this.x, this.y, pointer.x, pointer.y);
    });

    this.scene.input.on('pointerdown', () => {
      this.isShooting = true;
    });

    this.scene.input.on('pointerup', () => {
      this.isShooting = false;
    });
  }

  private draw() {
    this.graphics.clear();

    // Draw player circle with scale
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.fillCircle(this.x, this.y, PLAYER_SIZE * this.scale);

    // Draw directional indicator (small triangle) with scale
    this.graphics.fillStyle(COLORS.player, 1);
    const indicatorLength = PLAYER_SIZE * 1.5 * this.scale;
    const tipX = this.x + Math.cos(this.rotation) * indicatorLength;
    const tipY = this.y + Math.sin(this.rotation) * indicatorLength;

    const angle1 = this.rotation + Math.PI - Math.PI / 6;
    const angle2 = this.rotation + Math.PI + Math.PI / 6;
    const baseX1 = this.x + Math.cos(angle1) * (PLAYER_SIZE * 0.7 * this.scale);
    const baseY1 = this.y + Math.sin(angle1) * (PLAYER_SIZE * 0.7 * this.scale);
    const baseX2 = this.x + Math.cos(angle2) * (PLAYER_SIZE * 0.7 * this.scale);
    const baseY2 = this.y + Math.sin(angle2) * (PLAYER_SIZE * 0.7 * this.scale);

    this.graphics.fillTriangle(tipX, tipY, baseX1, baseY1, baseX2, baseY2);
  }

  update(_time: number, delta: number): { shouldShoot: boolean; targetX: number; targetY: number } {
    // Update cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    // Check if should shoot
    let shouldShoot = false;
    let targetX = 0;
    let targetY = 0;

    if (this.isShooting && this.shootCooldown <= 0) {
      shouldShoot = true;
      this.shootCooldown = FIRE_COOLDOWN;

      const pointer = this.scene.input.activePointer;
      targetX = pointer.x;
      targetY = pointer.y;

      // Pulse effect when shooting
      this.scene.tweens.add({
        targets: this,
        scale: 1.4,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    this.draw();

    return { shouldShoot, targetX, targetY };
  }

  getRotation(): number {
    return this.rotation;
  }

  destroy() {
    this.graphics.destroy();
  }
}
