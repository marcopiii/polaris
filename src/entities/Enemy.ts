import Phaser from 'phaser';
import {
  ENEMY_SIZE,
  ENEMY_SPEED,
  COLORS,
  PLAYFIELD_RADIUS,
  ENEMY_HEALTH_MODEL,
  HealthModel,
} from '../constants';
import type { PolarCoordinates } from '../types';
import { polarToCartesian } from '../utils/PolarCoordinates';
import { acquireGraphics, releaseGraphics } from '../utils/GraphicsPool';

export default class Enemy {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private polar: PolarCoordinates;
  private centerX: number;
  private centerY: number;
  private health: number;
  private displaySize: number;
  public active: boolean = true;
  public x: number = 0;
  public y: number = 0;
  public readonly tier: number;
  private _bounds = { x: 0, y: 0, radius: 0 };

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

    // Acquire pooled graphics and draw once at origin; position via setPosition
    this.graphics = acquireGraphics();
    this.updatePosition();
    this.drawShape();
  }

  /** Compute the visual/collision size for a given health value. */
  static sizeForHealth(health: number): number {
    if (ENEMY_HEALTH_MODEL === HealthModel.CIRCLE) {
      return ENEMY_SIZE * Math.sqrt(health);
    } else {
      return ENEMY_SIZE * Math.cbrt(health);
    }
  }

  private updatePosition() {
    const cartesian = polarToCartesian(this.polar);
    this.x = this.centerX + cartesian.x;
    this.y = this.centerY + cartesian.y;
  }

  /** Redraw the shape at origin. Only needed when displaySize changes. */
  private drawShape() {
    this.graphics.clear();
    this.graphics.fillStyle(COLORS.enemy, 1);
    this.graphics.fillCircle(0, 0, this.displaySize);
    this.graphics.setPosition(this.x, this.y);
  }

  update(delta: number, speedMultiplier: number = 1) {
    if (!this.active) return;

    // Move toward center with speed multiplier from power-ups
    const deltaSec = delta / 1000;
    const moveAmount = ENEMY_SPEED * PLAYFIELD_RADIUS * deltaSec * speedMultiplier;
    this.polar.r -= moveAmount;

    this.updatePosition();
    // Move the Graphics object; no shape redraw needed
    this.graphics.setPosition(this.x, this.y);
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
    this.drawShape();

    // Brief white flash to indicate a non-lethal hit
    this.flashWhite();
    return false;
  }

  private flashWhite() {
    // Overdraw a white circle at origin, then restore normal color after a short delay
    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(0, 0, this.displaySize);

    this.scene.time.delayedCall(60, () => {
      if (this.active) {
        this.drawShape();
      }
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
    releaseGraphics(this.graphics);
  }

  getBounds(): { x: number; y: number; radius: number } {
    this._bounds.x = this.x;
    this._bounds.y = this.y;
    this._bounds.radius = this.displaySize;
    return this._bounds;
  }
}
