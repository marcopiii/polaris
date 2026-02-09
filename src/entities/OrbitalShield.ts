import Phaser from 'phaser';
import {
  SHIELD_ORBIT_OFFSET,
  SHIELD_ARC_ANGLE,
  SHIELD_ARC_SHRINK,
  SHIELD_ARC_MIN,
  SHIELD_THICKNESS,
} from '../constants';
import { acquireGraphics, releaseGraphics } from '../utils/GraphicsPool';

export default class OrbitalShield {
  private graphics: Phaser.GameObjects.Graphics;
  private centerX: number;
  private centerY: number;
  private slotAngle: number;
  private angle: number = 0;
  private orbitRadius: number = 0;
  public active: boolean = true;
  public x: number = 0;
  public y: number = 0;
  public readonly slot: number;
  private arcAngle: number = SHIELD_ARC_ANGLE;
  private _innerR: number = 0;
  private _outerR: number = 0;
  private lastOrbitRadius: number = -1;
  private lastArcAngle: number = -1;

  constructor(
    _scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    slot: number,
    slotAngle: number
  ) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.slot = slot;
    this.slotAngle = slotAngle;

    this.graphics = acquireGraphics();
    this.graphics.setPosition(centerX, centerY);
  }

  /** Redraw the arc shape at origin. Only needed when orbitRadius or arcAngle changes. */
  private drawShape() {
    this.lastOrbitRadius = this.orbitRadius;
    this.lastArcAngle = this.arcAngle;

    this._innerR = this.orbitRadius - SHIELD_THICKNESS / 2;
    this._outerR = this.orbitRadius + SHIELD_THICKNESS / 2;

    const halfArc = this.arcAngle / 2;

    this.graphics.clear();
    this.graphics.lineStyle(SHIELD_THICKNESS, 0xffffff, 1);
    this.graphics.beginPath();
    this.graphics.arc(
      0,
      0,
      this.orbitRadius,
      this.slotAngle - halfArc,
      this.slotAngle + halfArc,
      false
    );
    this.graphics.strokePath();
  }

  update(terminalRadius: number, rotation: number) {
    if (!this.active) return;

    this.orbitRadius = terminalRadius + SHIELD_ORBIT_OFFSET;
    this.angle = this.slotAngle + rotation;

    this.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
    this.y = this.centerY + Math.sin(this.angle) * this.orbitRadius;

    // Only redraw shape when geometry changes; rotation handled by setRotation
    if (this.orbitRadius !== this.lastOrbitRadius || this.arcAngle !== this.lastArcAngle) {
      this.drawShape();
    }
    this.graphics.setRotation(rotation);
  }

  /** Register a hit. Returns true if shield is destroyed. */
  onHit(): boolean {
    this.arcAngle -= SHIELD_ARC_SHRINK;
    if (this.arcAngle < SHIELD_ARC_MIN) {
      this.destroy();
      return true;
    }
    return false;
  }

  /** Check if a point (enemy center) collides with this arc shield */
  checkCollision(ex: number, ey: number, enemyRadius: number): boolean {
    const dx = ex - this.centerX;
    const dy = ey - this.centerY;
    const distSq = dx * dx + dy * dy;

    // Early reject with squared distances (avoids sqrt for most enemies)
    const farEdge = this._outerR + enemyRadius;
    if (distSq > farEdge * farEdge) return false;
    const nearEdge = this._innerR - enemyRadius;
    if (nearEdge > 0 && distSq < nearEdge * nearEdge) return false;

    // Only compute sqrt + atan2 for the few enemies in the radial band
    const dist = Math.sqrt(distSq);
    const enemyAngle = Math.atan2(dy, dx);
    let diff = enemyAngle - this.angle;
    // Normalize to [-PI, PI]
    diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    const halfArc = this.arcAngle / 2;
    const angularExtent = dist > 0 ? enemyRadius / dist : Math.PI;

    return Math.abs(diff) < halfArc + angularExtent;
  }

  getArcInfo(): {
    centerX: number;
    centerY: number;
    angle: number;
    arcAngle: number;
    radius: number;
  } {
    return {
      centerX: this.centerX,
      centerY: this.centerY,
      angle: this.angle,
      arcAngle: this.arcAngle,
      radius: this.orbitRadius,
    };
  }

  destroy() {
    this.active = false;
    releaseGraphics(this.graphics);
  }
}
