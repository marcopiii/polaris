import Phaser from 'phaser';
import { SHIELD_ORBIT_RADIUS, SHIELD_ORBIT_SPEED, SHIELD_SIZE } from '../constants';

export default class OrbitalShield {
  private graphics: Phaser.GameObjects.Graphics;
  private centerX: number;
  private centerY: number;
  private angle: number;
  public active: boolean = true;
  public x: number = 0;
  public y: number = 0;

  constructor(scene: Phaser.Scene, centerX: number, centerY: number, startAngle: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.angle = startAngle;

    this.graphics = scene.add.graphics();
    this.updatePosition();
    this.draw();
  }

  private updatePosition() {
    this.x = this.centerX + Math.cos(this.angle) * SHIELD_ORBIT_RADIUS;
    this.y = this.centerY + Math.sin(this.angle) * SHIELD_ORBIT_RADIUS;
  }

  private draw() {
    this.graphics.clear();

    // Outer glow
    this.graphics.fillStyle(0x44aaff, 0.15);
    this.graphics.fillCircle(this.x, this.y, SHIELD_SIZE + 6);

    // Mid glow
    this.graphics.fillStyle(0x44aaff, 0.3);
    this.graphics.fillCircle(this.x, this.y, SHIELD_SIZE + 3);

    // Core
    this.graphics.fillStyle(0x88ccff, 0.8);
    this.graphics.fillCircle(this.x, this.y, SHIELD_SIZE);
  }

  update(delta: number) {
    if (!this.active) return;

    const deltaSec = delta / 1000;
    this.angle += SHIELD_ORBIT_SPEED * deltaSec;

    this.updatePosition();
    this.draw();
  }

  getBounds(): { x: number; y: number; radius: number } {
    return {
      x: this.x,
      y: this.y,
      radius: SHIELD_SIZE,
    };
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}
