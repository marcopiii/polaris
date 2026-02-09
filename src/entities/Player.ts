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
  }

  update(
    _time: number,
    delta: number,
    fireCooldown: number = FIRE_COOLDOWN
  ): { shouldShoot: boolean; targetX: number; targetY: number } {
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
      this.shootCooldown = fireCooldown;

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

  setScale(scale: number) {
    this.scale = scale;
  }

  getScale(): number {
    return this.scale;
  }

  getRotation(): number {
    return this.rotation;
  }

  destroy() {
    this.graphics.destroy();
  }
}
