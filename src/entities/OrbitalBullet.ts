import Phaser from 'phaser';
import { ORBITAL_BULLET_ANGULAR_SPEED, ORBITAL_BULLET_SIZE, PX } from '../constants';
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

  private draw() {
    this.graphics.clear();

    // Outer glow
    this.graphics.fillStyle(0xffffff, 0.2);
    this.graphics.fillCircle(this.x, this.y, ORBITAL_BULLET_SIZE + 4 * PX);

    // Mid glow
    this.graphics.fillStyle(0xffffff, 0.5);
    this.graphics.fillCircle(this.x, this.y, ORBITAL_BULLET_SIZE + 2 * PX);

    // Core
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(this.x, this.y, ORBITAL_BULLET_SIZE);
  }

  update(delta: number) {
    if (!this.active) return;

    const dt = delta / 1000;
    this.prevX = this.x;
    this.prevY = this.y;

    this.angle += this.direction * ORBITAL_BULLET_ANGULAR_SPEED * dt;

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
