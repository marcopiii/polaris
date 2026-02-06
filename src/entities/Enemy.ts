import Phaser from 'phaser';
import { ENEMY_SIZE, ENEMY_SPEED, COLORS, PLAYFIELD_RADIUS } from '../constants';
import type { PolarCoordinates } from '../types';
import { polarToCartesian } from '../utils/PolarCoordinates';

export default class Enemy {
  private graphics: Phaser.GameObjects.Graphics;
  private polar: PolarCoordinates;
  private centerX: number;
  private centerY: number;
  public active: boolean = true;
  public x: number = 0;
  public y: number = 0;

  constructor(scene: Phaser.Scene, theta: number, centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;

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

  private updatePosition() {
    const cartesian = polarToCartesian(this.polar);
    this.x = this.centerX + cartesian.x;
    this.y = this.centerY + cartesian.y;
  }

  private draw() {
    this.graphics.clear();
    this.graphics.fillStyle(COLORS.enemy, 1);
    this.graphics.fillCircle(this.x, this.y, ENEMY_SIZE);
  }

  update(delta: number) {
    if (!this.active) return;

    // Move toward center
    const deltaSec = delta / 1000;
    const moveAmount = ENEMY_SPEED * PLAYFIELD_RADIUS * deltaSec;
    this.polar.r -= moveAmount;

    this.updatePosition();
    this.draw();
  }

  getRadius(): number {
    return this.polar.r;
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }

  getBounds(): { x: number; y: number; radius: number } {
    return {
      x: this.x,
      y: this.y,
      radius: ENEMY_SIZE,
    };
  }
}
