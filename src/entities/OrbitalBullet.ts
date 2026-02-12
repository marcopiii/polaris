import Phaser from 'phaser';
import {
  COLORS,
  ORBITAL_BULLET_LINEAR_SPEED,
  ORBITAL_BULLET_SIZE,
  PLAYFIELD_RADIUS,
  PX,
} from '../constants';
import { gameRandom } from '../utils/BenchmarkConfig';

export default class OrbitalBullet {
  private graphics: Phaser.GameObjects.Graphics;
  private centerX: number;
  private centerY: number;
  private orbitRadius: number;
  private angle: number;
  private direction: number; // +1 CCW, -1 CW
  private pierceChance: number;
  public x: number = 0;
  public y: number = 0;
  public prevX: number = 0;
  public prevY: number = 0;
  public active: boolean = true;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    orbitRadius: number,
    startAngle: number,
    direction: number,
    pierceChance: number
  ) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
    this.angle = startAngle;
    this.direction = direction;
    this.pierceChance = pierceChance;

    this.x = centerX + Math.cos(this.angle) * this.orbitRadius;
    this.y = centerY + Math.sin(this.angle) * this.orbitRadius;
    this.prevX = this.x;
    this.prevY = this.y;

    this.graphics = scene.add.graphics();
    this.draw();
  }

  private static readonly WIDTH = 18 * PX;
  private static readonly HEIGHT = 6 * PX;

  private draw() {
    this.graphics.clear();

    // Orient along direction of travel (tangent to orbit)
    const tangentAngle = this.angle + (this.direction > 0 ? Math.PI / 2 : -Math.PI / 2);

    this.graphics.save();
    this.graphics.translateCanvas(this.x, this.y);
    this.graphics.rotateCanvas(tangentAngle);

    // Outer glow
    this.graphics.fillStyle(COLORS.bullet, 0.2);
    this.graphics.fillEllipse(0, 0, OrbitalBullet.WIDTH + 4 * PX, OrbitalBullet.HEIGHT + 4 * PX);

    // Mid glow
    this.graphics.fillStyle(COLORS.bullet, 0.5);
    this.graphics.fillEllipse(0, 0, OrbitalBullet.WIDTH + 2 * PX, OrbitalBullet.HEIGHT + 2 * PX);

    // Core
    this.graphics.fillStyle(COLORS.bullet, 1);
    this.graphics.fillEllipse(0, 0, OrbitalBullet.WIDTH, OrbitalBullet.HEIGHT);

    this.graphics.restore();
  }

  update(delta: number) {
    if (!this.active) return;

    const dt = delta / 1000;
    this.prevX = this.x;
    this.prevY = this.y;

    const angularSpeed = (ORBITAL_BULLET_LINEAR_SPEED * PLAYFIELD_RADIUS) / this.orbitRadius;
    this.angle += this.direction * angularSpeed * dt;

    this.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
    this.y = this.centerY + Math.sin(this.angle) * this.orbitRadius;

    this.draw();
  }

  /** Returns true if the bullet should survive the hit (probabilistic piercing) */
  onHitEnemy(): boolean {
    return gameRandom() < this.pierceChance;
  }

  getBounds(): { x: number; y: number; radius: number } {
    return { x: this.x, y: this.y, radius: ORBITAL_BULLET_SIZE };
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}
