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

export default class Bullet {
  private graphics: Phaser.GameObjects.Graphics;
  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  private velocityX: number;
  private velocityY: number;
  private centerX: number;
  private centerY: number;
  public active: boolean = true;
  public pierceChance: number;
  public isManual: boolean = false;
  public hasHitEnemy: boolean = false;
  public isFission: boolean = false;
  public fromConsumable: boolean = false;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    centerX: number,
    centerY: number,
    speedMultiplier: number = 1,
    pierceChance: number = 0,
    mask?: Phaser.Display.Masks.GeometryMask
  ) {
    this.x = startX;
    this.y = startY;
    this.prevX = startX;
    this.prevY = startY;
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

    // Create graphics
    this.graphics = scene.add.graphics();
    if (mask) this.graphics.setMask(mask);
    this.draw();
  }

  private draw() {
    this.graphics.clear();

    // Calculate rotation angle
    const angle = Math.atan2(this.velocityY, this.velocityX);

    // Draw glowing oval
    const color = this.isFission ? COLORS.fission : COLORS.bullet;
    this.graphics.fillStyle(color, 1);

    // Save transform state
    this.graphics.save();
    this.graphics.translateCanvas(this.x, this.y);
    this.graphics.rotateCanvas(angle);

    // Draw bullet as ellipse
    this.graphics.fillEllipse(0, 0, BULLET_WIDTH, BULLET_HEIGHT);

    // Add glow effect (multiple layers with alpha)
    this.graphics.fillStyle(color, 0.5);
    this.graphics.fillEllipse(0, 0, BULLET_WIDTH + 2 * PX, BULLET_HEIGHT + 2 * PX);
    this.graphics.fillStyle(color, 0.2);
    this.graphics.fillEllipse(0, 0, BULLET_WIDTH + 4 * PX, BULLET_HEIGHT + 4 * PX);

    this.graphics.restore();
  }

  update(delta: number) {
    if (!this.active) return;

    const deltaSec = delta / 1000;
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.velocityX * deltaSec;
    this.y += this.velocityY * deltaSec;

    // Check if out of bounds
    if (this.checkOutOfBounds()) {
      this.destroy();
      return;
    }

    this.draw();
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
    this.graphics.destroy();
  }

  getBounds(): { x: number; y: number; radius: number } {
    return {
      x: this.x,
      y: this.y,
      radius: Math.max(BULLET_WIDTH, BULLET_HEIGHT) / 2,
    };
  }
}
