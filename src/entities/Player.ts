import Phaser from 'phaser';
import { PLAYER_SIZE, FIRE_COOLDOWN, COLORS, PLAYFIELD_RADIUS } from '../constants';
import { angleBetween } from '../utils/MathUtils';
import GamepadManager from '../managers/GamepadManager';

export default class Player {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  public x: number;
  public y: number;
  private rotation: number = 0;
  private prevRotation: number = 0;
  private shootCooldown: number = 0;
  private isShooting: boolean = false;
  private scale: number = 1.0;
  private benchmarkMode: boolean;
  private gamepadManager: GamepadManager | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, benchmarkMode: boolean = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.benchmarkMode = benchmarkMode;

    // Create graphics
    this.graphics = scene.add.graphics();
    this.draw();

    // Set up input
    if (benchmarkMode) {
      this.isShooting = true;
    } else {
      this.setupInput();
    }
  }

  setGamepadManager(manager: GamepadManager) {
    this.gamepadManager = manager;
  }

  private setupInput() {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.rotation = angleBetween(this.x, this.y, pointer.x, pointer.y);
    });
  }

  private draw() {
    this.graphics.clear();

    // Draw player circle with scale
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.fillCircle(this.x, this.y, PLAYER_SIZE * this.scale);
  }

  update(
    _time: number,
    delta: number,
    fireCooldown: number = FIRE_COOLDOWN,
    aimTarget?: { x: number; y: number },
    maxAngularSpeed?: number
  ): { shouldShoot: boolean; targetX: number; targetY: number } {
    // Poll gamepad for aim and shoot
    let gamepadAiming = false;
    if (this.gamepadManager) {
      const aimAngle = this.gamepadManager.getAimAngle();
      if (aimAngle !== null) {
        this.rotation = aimAngle;
        gamepadAiming = true;
      }
    }

    // Clamp angular velocity when a cap is active
    if (maxAngularSpeed !== undefined) {
      const maxDelta = maxAngularSpeed * (delta / 1000);
      const diff = Math.atan2(
        Math.sin(this.rotation - this.prevRotation),
        Math.cos(this.rotation - this.prevRotation)
      );
      if (Math.abs(diff) > maxDelta) {
        this.rotation = this.prevRotation + Math.sign(diff) * maxDelta;
      }
    }

    // Update cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    // Check if should shoot (pointer held or gamepad stick outside deadzone)
    const pointerShooting = !this.benchmarkMode && this.scene.input.activePointer?.isDown;
    let shouldShoot = false;
    let targetX = 0;
    let targetY = 0;

    if ((this.isShooting || pointerShooting || gamepadAiming) && this.shootCooldown <= 0) {
      shouldShoot = true;
      this.shootCooldown = fireCooldown;

      if (this.benchmarkMode && aimTarget) {
        targetX = aimTarget.x;
        targetY = aimTarget.y;
        this.rotation = angleBetween(this.x, this.y, targetX, targetY);
      } else if (gamepadAiming) {
        // Project target from player position along the aim direction
        targetX = this.x + Math.cos(this.rotation) * PLAYFIELD_RADIUS;
        targetY = this.y + Math.sin(this.rotation) * PLAYFIELD_RADIUS;
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

    // Snapshot rotation for next frame's angular velocity cap
    this.prevRotation = this.rotation;

    return { shouldShoot, targetX, targetY };
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
    this.graphics.destroy();
  }
}
