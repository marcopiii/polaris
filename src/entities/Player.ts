import Phaser from 'phaser';
import {
  PLAYER_SIZE,
  COLORS,
  PLAYFIELD_RADIUS,
  LASER_ANGULAR_ACCEL,
  PLAYER_BASE_SURFACE,
  PLAYER_HEAT_PER_SHOT,
  PLAYER_COOLING_RATE,
} from '../constants';
import { angleBetween } from '../utils/MathUtils';
import GamepadManager from '../managers/GamepadManager';

export default class Player {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  public x: number;
  public y: number;
  private rotation: number = 0;
  private desiredRotation: number = 0;
  private angularVelocity: number = 0;
  private shootCooldown: number = 0;
  private isShooting: boolean = false;
  private firing: boolean = false;
  private scale: number = 1.0;
  private heatSurface: number = PLAYER_BASE_SURFACE;
  private scaleOverride: number | null = null;
  private benchmarkMode: boolean;
  private gamepadManager: GamepadManager | null = null;
  private gamepadAimActive: boolean = false;

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
      this.desiredRotation = angleBetween(this.x, this.y, pointer.x, pointer.y);
    });
  }

  draw() {
    this.graphics.clear();

    // Draw player circle with scale
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.fillCircle(this.x, this.y, PLAYER_SIZE * this.scale);
  }

  update(
    _time: number,
    delta: number,
    fireCooldown: number = 500,
    aimTarget?: { x: number; y: number },
    maxAngularSpeed?: number
  ): { shouldShoot: boolean; targetX: number; targetY: number } {
    // Poll gamepad for aim (stick) and shoot (RB)
    this.gamepadAimActive = false;
    let gamepadShooting = false;
    if (this.gamepadManager) {
      const aimAngle = this.gamepadManager.getAimAngle();
      if (aimAngle !== null) {
        this.desiredRotation = aimAngle;
        this.gamepadAimActive = true;
      }
      gamepadShooting = this.gamepadManager.isRBPressed();
    }

    // Apply rotation toward desired angle
    if (maxAngularSpeed !== undefined) {
      // Accelerate/decelerate with trapezoidal velocity profile
      const dt = delta / 1000;
      const diff = Math.atan2(
        Math.sin(this.desiredRotation - this.rotation),
        Math.cos(this.desiredRotation - this.rotation)
      );
      const absDiff = Math.abs(diff);

      // Braking distance at current speed: v² / (2a)
      const absVel = Math.abs(this.angularVelocity);
      const brakeDist = (absVel * absVel) / (2 * LASER_ANGULAR_ACCEL);

      // Brake if heading toward target and close enough to need stopping
      const headingToward = Math.sign(this.angularVelocity) === Math.sign(diff);
      const shouldBrake = headingToward && absDiff <= brakeDist;

      if (shouldBrake || absDiff < 0.005) {
        // Decelerate
        const decel = LASER_ANGULAR_ACCEL * dt;
        if (absVel <= decel) {
          this.angularVelocity = 0;
        } else {
          this.angularVelocity -= Math.sign(this.angularVelocity) * decel;
        }
      } else {
        // Accelerate toward target
        this.angularVelocity += Math.sign(diff) * LASER_ANGULAR_ACCEL * dt;
      }

      // Clamp to max speed
      this.angularVelocity = Math.max(
        -maxAngularSpeed,
        Math.min(maxAngularSpeed, this.angularVelocity)
      );

      // Apply velocity
      this.rotation += this.angularVelocity * dt;

      // Snap if very close and nearly stopped
      if (absDiff < 0.01 && absVel < 0.1) {
        this.rotation = this.desiredRotation;
        this.angularVelocity = 0;
      }
    } else {
      // No cap — snap instantly
      this.rotation = this.desiredRotation;
      this.angularVelocity = 0;
    }

    // Cool down heat
    const dt = delta / 1000;
    this.heatSurface = Math.max(PLAYER_BASE_SURFACE, this.heatSurface - PLAYER_COOLING_RATE * dt);

    // Update cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    // Check if should shoot (pointer held, gamepad RB, or benchmark auto-shoot)
    const pointerShooting = !this.benchmarkMode && this.scene.input.activePointer?.isDown;
    this.firing = this.isShooting || pointerShooting || gamepadShooting;
    let shouldShoot = false;
    let targetX = 0;
    let targetY = 0;

    if ((this.isShooting || pointerShooting || gamepadShooting) && this.shootCooldown <= 0) {
      shouldShoot = true;
      this.shootCooldown = fireCooldown;

      if (this.benchmarkMode && aimTarget) {
        targetX = aimTarget.x;
        targetY = aimTarget.y;
        this.desiredRotation = angleBetween(this.x, this.y, targetX, targetY);
        this.rotation = this.desiredRotation;
      } else if (gamepadShooting) {
        // Project target from player position along the aim direction
        targetX = this.x + Math.cos(this.rotation) * PLAYFIELD_RADIUS;
        targetY = this.y + Math.sin(this.rotation) * PLAYFIELD_RADIUS;
      } else {
        const pointer = this.scene.input.activePointer;
        targetX = pointer.x;
        targetY = pointer.y;
      }

      // Increase heat on shot
      this.heatSurface += PLAYER_HEAT_PER_SHOT;
    }

    // Derive scale from heat when not overridden
    if (this.scaleOverride === null) {
      this.scale = Math.sqrt(this.heatSurface / PLAYER_BASE_SURFACE);
    }

    this.draw();

    return { shouldShoot, targetX, targetY };
  }

  setScale(scale: number) {
    this.scaleOverride = scale;
    this.scale = scale;
    this.draw();
  }

  clearScaleOverride() {
    this.scaleOverride = null;
    this.scale = Math.sqrt(this.heatSurface / PLAYER_BASE_SURFACE);
  }

  getScale(): number {
    return this.scale;
  }

  /** Current scale derived from heat (ignores scale override). */
  getHeatScale(): number {
    return Math.sqrt(this.heatSurface / PLAYER_BASE_SURFACE);
  }

  /** Current radius in pixels based on heat (ignores scale override). */
  getHeatRadius(): number {
    return PLAYER_SIZE * this.getHeatScale();
  }

  resetHeat() {
    this.heatSurface = PLAYER_BASE_SURFACE;
    if (this.scaleOverride === null) {
      this.scale = 1.0;
    }
  }

  getRotation(): number {
    return this.rotation;
  }

  isFiringActive(): boolean {
    return this.firing;
  }

  isGamepadAiming(): boolean {
    return this.gamepadAimActive;
  }

  destroy() {
    this.graphics.destroy();
  }
}
