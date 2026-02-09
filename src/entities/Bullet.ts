import Phaser from 'phaser';
import {
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  COLORS,
  PLAYFIELD_RADIUS,
  PX,
} from '../constants';
import { distance } from '../utils/MathUtils';
import { gameRandom } from '../utils/BenchmarkConfig';
import { acquireGraphics, releaseGraphics } from '../utils/GraphicsPool';

export default class Bullet {
  private graphics: Phaser.GameObjects.Graphics;
  public x: number;
  public y: number;
  private velocityX: number;
  private velocityY: number;
  private centerX: number;
  private centerY: number;
  public active: boolean = true;
  public pierceChance: number;
  public isManual: boolean = false;
  public hasHitEnemy: boolean = false;
  private _bounds = { x: 0, y: 0, radius: Math.max(BULLET_WIDTH, BULLET_HEIGHT) / 2 };

  constructor(
    _scene: Phaser.Scene,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    centerX: number,
    centerY: number,
    speedMultiplier: number = 1,
    pierceChance: number = 0
  ) {
    this.x = startX;
    this.y = startY;
    this.centerX = centerX;
    this.centerY = centerY;
    this.pierceChance = pierceChance;

    // Calculate direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normalizedX = dx / dist;
    const normalizedY = dy / dist;

    // Set velocity (BULLET_SPEED is in playfield radii per second, need pixels per second)
    const pixelsPerSecond = BULLET_SPEED * speedMultiplier * PLAYFIELD_RADIUS;
    this.velocityX = normalizedX * pixelsPerSecond;
    this.velocityY = normalizedY * pixelsPerSecond;

    // Acquire pooled graphics: draw once at origin with rotation, then position via setPosition
    this.graphics = acquireGraphics();
    const angle = Math.atan2(this.velocityY, this.velocityX);
    this.graphics.setRotation(angle);

    // Outer glow (drawn first, behind core)
    this.graphics.fillStyle(COLORS.bullet, 0.15);
    this.graphics.fillEllipse(0, 0, BULLET_WIDTH + 4 * PX, BULLET_HEIGHT + 4 * PX);

    // Core bullet (drawn on top)
    this.graphics.fillStyle(COLORS.bullet, 1);
    this.graphics.fillEllipse(0, 0, BULLET_WIDTH, BULLET_HEIGHT);

    this.graphics.setPosition(this.x, this.y);
  }

  update(delta: number) {
    if (!this.active) return;

    const deltaSec = delta / 1000;
    this.x += this.velocityX * deltaSec;
    this.y += this.velocityY * deltaSec;

    // Check if out of bounds
    if (this.checkOutOfBounds()) {
      this.destroy();
      return;
    }

    // Move the Graphics object; no shape redraw needed
    this.graphics.setPosition(this.x, this.y);
  }

  private checkOutOfBounds(): boolean {
    const distanceFromCenter = distance(this.x, this.y, this.centerX, this.centerY);
    return distanceFromCenter > PLAYFIELD_RADIUS;
  }

  /** Returns true if the bullet should survive the hit (probabilistic piercing) */
  onHitEnemy(): boolean {
    return gameRandom() < this.pierceChance;
  }

  destroy() {
    this.active = false;
    releaseGraphics(this.graphics);
  }

  getBounds(): { x: number; y: number; radius: number } {
    this._bounds.x = this.x;
    this._bounds.y = this.y;
    return this._bounds;
  }
}
