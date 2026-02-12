import Phaser from 'phaser';
import {
  PLAYFIELD_RADIUS,
  ORBITAL_FLARE_SPEED,
  ORBITAL_FLARE_SPAWN_INTERVAL,
  ORBITAL_FLARE_WIDTH,
  ORBITAL_FLARE_HEIGHT,
  PX,
} from '../constants';
import OrbitalBullet from './OrbitalBullet';

export default class OrbitalFlare {
  private graphics: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private centerX: number;
  private centerY: number;
  private angle: number; // travel direction
  private radius: number = 0; // distance from center in pixels
  private distanceSinceLastSpawn: number = 0; // in radii units
  private nextDirection: number = 1; // alternates +1 / -1
  private pierceChance: number;
  public active: boolean = true;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    angle: number,
    pierceChance: number
  ) {
    this.scene = scene;
    this.centerX = centerX;
    this.centerY = centerY;
    this.angle = angle;
    this.pierceChance = pierceChance;

    this.graphics = scene.add.graphics();
  }

  /** Returns newly spawned OrbitalBullets this frame */
  update(delta: number): OrbitalBullet[] {
    if (!this.active) return [];

    const dt = delta / 1000;
    const radiusDelta = ORBITAL_FLARE_SPEED * PLAYFIELD_RADIUS * dt;
    this.radius += radiusDelta;

    // Check if flare has exited the playfield
    if (this.radius > PLAYFIELD_RADIUS) {
      this.destroy();
      return [];
    }

    // Accumulate distance in radii units
    this.distanceSinceLastSpawn += ORBITAL_FLARE_SPEED * dt;

    // Spawn bullets at intervals
    const spawned: OrbitalBullet[] = [];
    while (this.distanceSinceLastSpawn >= ORBITAL_FLARE_SPAWN_INTERVAL) {
      this.distanceSinceLastSpawn -= ORBITAL_FLARE_SPAWN_INTERVAL;

      const bullet = new OrbitalBullet(
        this.scene,
        this.centerX,
        this.centerY,
        this.radius,
        this.angle,
        this.nextDirection,
        this.pierceChance
      );
      spawned.push(bullet);

      // Alternate direction
      this.nextDirection *= -1;
    }

    this.draw();
    return spawned;
  }

  private draw() {
    this.graphics.clear();

    const x = this.centerX + Math.cos(this.angle) * this.radius;
    const y = this.centerY + Math.sin(this.angle) * this.radius;

    this.graphics.save();
    this.graphics.translateCanvas(x, y);
    this.graphics.rotateCanvas(this.angle);

    // Outer glow
    this.graphics.fillStyle(0xff8844, 0.2);
    this.graphics.fillEllipse(0, 0, ORBITAL_FLARE_WIDTH + 4 * PX, ORBITAL_FLARE_HEIGHT + 4 * PX);

    // Mid glow
    this.graphics.fillStyle(0xff8844, 0.5);
    this.graphics.fillEllipse(0, 0, ORBITAL_FLARE_WIDTH + 2 * PX, ORBITAL_FLARE_HEIGHT + 2 * PX);

    // Core
    this.graphics.fillStyle(0xff8844, 1);
    this.graphics.fillEllipse(0, 0, ORBITAL_FLARE_WIDTH, ORBITAL_FLARE_HEIGHT);

    this.graphics.restore();
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}
