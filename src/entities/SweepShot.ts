import Phaser from 'phaser';
import {
  PLAYFIELD_RADIUS,
  SWEEPSHOT_SPEED,
  SWEEPSHOT_ARC_ANGLE,
  SWEEPSHOT_THICKNESS_INNER,
  SWEEPSHOT_THICKNESS_MID,
  SWEEPSHOT_THICKNESS_OUTER,
  SWEEPSHOT_LAYER_GAP,
} from '../constants';

export default class SweepShot {
  private graphics: Phaser.GameObjects.Graphics;
  private centerX: number;
  private centerY: number;
  private angle: number; // center angle of the arc
  private radius: number = 0; // leading edge radius (outer layer outer edge)
  public active: boolean = true;

  constructor(scene: Phaser.Scene, centerX: number, centerY: number, angle: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.angle = angle;
    this.graphics = scene.add.graphics();
  }

  update(delta: number) {
    if (!this.active) return;

    const deltaSec = delta / 1000;
    this.radius += SWEEPSHOT_SPEED * PLAYFIELD_RADIUS * deltaSec;

    if (this.radius - this.getTotalDepth() > PLAYFIELD_RADIUS) {
      this.destroy();
      return;
    }

    this.draw();
  }

  /** Total radial depth from innermost edge to outermost edge */
  private getTotalDepth(): number {
    return (
      SWEEPSHOT_THICKNESS_INNER +
      SWEEPSHOT_LAYER_GAP +
      SWEEPSHOT_THICKNESS_MID +
      SWEEPSHOT_LAYER_GAP +
      SWEEPSHOT_THICKNESS_OUTER
    );
  }

  private draw() {
    this.graphics.clear();

    const halfArc = SWEEPSHOT_ARC_ANGLE / 2;
    const startAngle = this.angle - halfArc;
    const endAngle = this.angle + halfArc;

    // Layers from outside in: outer (thickest), mid, inner (thinnest)
    // Outer layer: centered at this.radius
    const outerR = Math.max(0, this.radius);
    // Mid layer: one gap inward
    const midR = Math.max(
      0,
      this.radius -
        SWEEPSHOT_THICKNESS_OUTER / 2 -
        SWEEPSHOT_LAYER_GAP -
        SWEEPSHOT_THICKNESS_MID / 2
    );
    // Inner layer: two gaps inward
    const innerR = Math.max(
      0,
      this.radius -
        SWEEPSHOT_THICKNESS_OUTER / 2 -
        SWEEPSHOT_LAYER_GAP -
        SWEEPSHOT_THICKNESS_MID -
        SWEEPSHOT_LAYER_GAP -
        SWEEPSHOT_THICKNESS_INNER / 2
    );

    // Draw outer arc (thickest, brightest)
    if (outerR > 0 && outerR - SWEEPSHOT_THICKNESS_OUTER / 2 < PLAYFIELD_RADIUS) {
      this.graphics.lineStyle(SWEEPSHOT_THICKNESS_OUTER, 0xffffff, 1.0);
      this.graphics.beginPath();
      this.graphics.arc(this.centerX, this.centerY, outerR, startAngle, endAngle, false);
      this.graphics.strokePath();
    }

    // Draw mid arc
    if (midR > 0 && midR - SWEEPSHOT_THICKNESS_MID / 2 < PLAYFIELD_RADIUS) {
      this.graphics.lineStyle(SWEEPSHOT_THICKNESS_MID, 0xffffff, 0.8);
      this.graphics.beginPath();
      this.graphics.arc(this.centerX, this.centerY, midR, startAngle, endAngle, false);
      this.graphics.strokePath();
    }

    // Draw inner arc (thinnest, dimmest)
    if (innerR > 0 && innerR - SWEEPSHOT_THICKNESS_INNER / 2 < PLAYFIELD_RADIUS) {
      this.graphics.lineStyle(SWEEPSHOT_THICKNESS_INNER, 0xffffff, 0.6);
      this.graphics.beginPath();
      this.graphics.arc(this.centerX, this.centerY, innerR, startAngle, endAngle, false);
      this.graphics.strokePath();
    }
  }

  /** Check if an enemy collides with any of the three arc layers */
  checkCollision(ex: number, ey: number, enemyRadius: number): boolean {
    const dx = ex - this.centerX;
    const dy = ey - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check angular overlap first (shared by all layers)
    const enemyAngle = Math.atan2(dy, dx);
    let diff = enemyAngle - this.angle;
    diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    const halfArc = SWEEPSHOT_ARC_ANGLE / 2;
    const angularExtent = dist > 0 ? enemyRadius / dist : Math.PI;

    if (Math.abs(diff) >= halfArc + angularExtent) {
      return false;
    }

    // Check radial overlap against each layer
    const layers = this.getLayerRadii();
    for (const layer of layers) {
      if (layer.radius <= 0) continue;
      const innerR = layer.radius - layer.thickness / 2;
      const outerR = layer.radius + layer.thickness / 2;

      if (dist + enemyRadius >= innerR && dist - enemyRadius <= outerR) {
        return true;
      }
    }

    return false;
  }

  private getLayerRadii(): { radius: number; thickness: number }[] {
    const outerR = this.radius;
    const midR =
      this.radius -
      SWEEPSHOT_THICKNESS_OUTER / 2 -
      SWEEPSHOT_LAYER_GAP -
      SWEEPSHOT_THICKNESS_MID / 2;
    const innerR =
      this.radius -
      SWEEPSHOT_THICKNESS_OUTER / 2 -
      SWEEPSHOT_LAYER_GAP -
      SWEEPSHOT_THICKNESS_MID -
      SWEEPSHOT_LAYER_GAP -
      SWEEPSHOT_THICKNESS_INNER / 2;

    return [
      { radius: outerR, thickness: SWEEPSHOT_THICKNESS_OUTER },
      { radius: midR, thickness: SWEEPSHOT_THICKNESS_MID },
      { radius: innerR, thickness: SWEEPSHOT_THICKNESS_INNER },
    ];
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}
