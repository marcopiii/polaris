import Phaser from 'phaser';
import { PLAYER_SIZE, FIRE_COOLDOWN, COLORS } from '../constants';
import { angleBetween } from '../utils/MathUtils';

export default class Player {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  public x: number;
  public y: number;
  private rotation: number = 0;
  private shootCooldown: number = 0;
  private isShooting: boolean = false;
  private scale: number = 1.0;
  private lastDrawnScale: number = -1;
  private benchmarkMode: boolean;
  private _shootResult = { shouldShoot: false, targetX: 0, targetY: 0 };
  private onPointerMove: (pointer: Phaser.Input.Pointer) => void;
  private onPointerDown: () => void;
  private onPointerUp: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, benchmarkMode: boolean = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.benchmarkMode = benchmarkMode;

    // Create graphics
    this.graphics = scene.add.graphics();
    this.draw();

    // Set up input with stored references for cleanup
    this.onPointerMove = (pointer: Phaser.Input.Pointer) => {
      this.rotation = angleBetween(this.x, this.y, pointer.x, pointer.y);
    };
    this.onPointerDown = () => {
      this.isShooting = true;
    };
    this.onPointerUp = () => {
      this.isShooting = false;
    };

    if (benchmarkMode) {
      this.isShooting = true;
    } else {
      this.scene.input.on('pointermove', this.onPointerMove);
      this.scene.input.on('pointerdown', this.onPointerDown);
      this.scene.input.on('pointerup', this.onPointerUp);
    }
  }

  private draw() {
    if (this.scale === this.lastDrawnScale) return;
    this.lastDrawnScale = this.scale;

    this.graphics.clear();
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.fillCircle(this.x, this.y, PLAYER_SIZE * this.scale);
  }

  update(
    _time: number,
    delta: number,
    fireCooldown: number = FIRE_COOLDOWN,
    aimTarget?: { x: number; y: number }
  ): { shouldShoot: boolean; targetX: number; targetY: number } {
    // Update cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    // Check if should shoot
    let shouldShoot = false;
    let targetX = 0;
    let targetY = 0;

    if (this.isShooting && this.shootCooldown <= 0) {
      shouldShoot = true;
      this.shootCooldown = fireCooldown;

      if (this.benchmarkMode && aimTarget) {
        targetX = aimTarget.x;
        targetY = aimTarget.y;
        this.rotation = angleBetween(this.x, this.y, targetX, targetY);
      } else {
        const pointer = this.scene.input.activePointer;
        targetX = pointer.x;
        targetY = pointer.y;
      }

      // Pulse effect when shooting
      this.scene.tweens.add({
        targets: this,
        scale: 1.4,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    this.draw();

    this._shootResult.shouldShoot = shouldShoot;
    this._shootResult.targetX = targetX;
    this._shootResult.targetY = targetY;
    return this._shootResult;
  }

  setScale(scale: number) {
    this.scale = scale;
  }

  getScale(): number {
    return this.scale;
  }

  getRotation(): number {
    return this.rotation;
  }

  destroy() {
    if (!this.benchmarkMode) {
      this.scene.input.off('pointermove', this.onPointerMove);
      this.scene.input.off('pointerdown', this.onPointerDown);
      this.scene.input.off('pointerup', this.onPointerUp);
    }
    this.graphics.destroy();
  }
}
