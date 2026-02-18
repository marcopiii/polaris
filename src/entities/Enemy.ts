import Phaser from 'phaser';
import { ENEMY_SIZE, ENEMY_SPEED, COLORS, PLAYFIELD_RADIUS } from '../constants';
import type { PolarCoordinates } from '../types';
import { polarToCartesian } from '../utils/PolarCoordinates';

export default class Enemy {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private polar: PolarCoordinates;
  private centerX: number;
  private centerY: number;
  private health: number;
  private displaySize: number;
  private pushbackTween: Phaser.Tweens.Tween | null = null;
  public active: boolean = true;
  public x: number = 0;
  public y: number = 0;
  public readonly tier: number;

  constructor(
    scene: Phaser.Scene,
    theta: number,
    centerX: number,
    centerY: number,
    health: number = 1
  ) {
    this.scene = scene;
    this.tier = health;
    this.centerX = centerX;
    this.centerY = centerY;
    this.health = health;
    this.displaySize = Enemy.sizeForHealth(health);

    // Spawn at playfield edge
    this.polar = {
      r: PLAYFIELD_RADIUS,
      theta,
    };

    // Create graphics
    this.graphics = scene.add.graphics();
    this.updatePosition();
    this.draw();
  }

  /** Compute the visual/collision size for a given health value. */
  static sizeForHealth(health: number): number {
    return ENEMY_SIZE * Math.sqrt(health);
  }

  private updatePosition() {
    const cartesian = polarToCartesian(this.polar);
    this.x = this.centerX + cartesian.x;
    this.y = this.centerY + cartesian.y;
  }

  private draw() {
    this.graphics.clear();
    this.graphics.fillStyle(COLORS.enemy, 1);
    this.graphics.fillCircle(this.x, this.y, this.displaySize);
  }

  update(delta: number, speedMultiplier: number = 1) {
    if (!this.active) return;

    // Move toward center with speed multiplier from power-ups
    const deltaSec = delta / 1000;
    const moveAmount = ENEMY_SPEED * PLAYFIELD_RADIUS * deltaSec * speedMultiplier;
    this.polar.r -= moveAmount;

    this.updatePosition();
    this.draw();
  }

  /**
   * Apply one hit of damage. Returns true if the enemy died.
   * If the enemy survives, it shrinks to reflect its new health and flashes white.
   */
  hit(): boolean {
    this.health--;
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    // Shrink to new health-based size
    this.displaySize = Enemy.sizeForHealth(this.health);
    this.draw();

    // Brief white flash to indicate a non-lethal hit
    this.flashWhite();
    return false;
  }

  private flashWhite() {
    // Overdraw a white circle, then restore normal color after a short delay
    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(this.x, this.y, this.displaySize);

    this.scene.time.delayedCall(60, () => {
      if (this.active) {
        this.draw();
      }
    });
  }

  /** Push enemy away from center by the given pixel distance, clamped to playfield. */
  pushBack(amount: number) {
    const targetR = Math.min(this.polar.r + amount, PLAYFIELD_RADIUS);

    // Cancel any in-progress pushback so we tween from current position
    if (this.pushbackTween) {
      this.pushbackTween.stop();
      this.pushbackTween = null;
    }

    const proxy = { r: this.polar.r };
    this.pushbackTween = this.scene.tweens.add({
      targets: proxy,
      r: targetR,
      duration: 120,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (!this.active) return;
        this.polar.r = proxy.r;
        this.updatePosition();
        this.draw();
      },
      onComplete: () => {
        this.pushbackTween = null;
      },
    });
  }

  getRadius(): number {
    return this.polar.r;
  }

  getSize(): number {
    return this.displaySize;
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }

  getBounds(): { x: number; y: number; radius: number } {
    return {
      x: this.x,
      y: this.y,
      radius: this.displaySize,
    };
  }
}
