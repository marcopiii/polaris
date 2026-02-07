import Phaser from 'phaser';
import { GAMEPAD_DEADZONE } from '../constants';

export default class GamepadManager {
  private scene: Phaser.Scene;
  private prevButtons: boolean[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private getPad(): Phaser.Input.Gamepad.Gamepad | null {
    if (!this.scene.input.gamepad) return null;
    return this.scene.input.gamepad.pad1 ?? null;
  }

  /** Returns the aim angle from the left stick, or null if within deadzone. */
  getAimAngle(): number | null {
    const pad = this.getPad();
    if (!pad) return null;

    const lx = pad.leftStick.x;
    const ly = pad.leftStick.y;
    const magnitude = Math.sqrt(lx * lx + ly * ly);

    if (magnitude < GAMEPAD_DEADZONE) return null;

    return Math.atan2(ly, lx);
  }

  /** Returns true if the fire button is held (right trigger, right bumper, or A/Cross). */
  isShooting(): boolean {
    const pad = this.getPad();
    if (!pad) return false;

    return pad.R2 > 0.3 || pad.buttons[5]?.pressed || pad.A;
  }

  /** Returns true if the given button was just pressed this frame. */
  isButtonJustPressed(index: number): boolean {
    const pad = this.getPad();
    if (!pad) return false;

    const current = pad.buttons[index]?.pressed ?? false;
    const prev = this.prevButtons[index] ?? false;

    return current && !prev;
  }

  /** Returns true if A (button 0) was just pressed. */
  isAJustPressed(): boolean {
    return this.isButtonJustPressed(0);
  }

  /** Returns true if Start (button 9) was just pressed. */
  isStartJustPressed(): boolean {
    return this.isButtonJustPressed(9);
  }

  /** Returns true if B (button 1) was just pressed. */
  isBJustPressed(): boolean {
    return this.isButtonJustPressed(1);
  }

  /** Returns -1 for left, 1 for right, 0 for no horizontal input. D-pad or left stick. */
  getHorizontalNavigation(): number {
    const pad = this.getPad();
    if (!pad) return 0;

    // D-pad left (button 14) / right (button 15)
    const dpadLeft = this.isButtonJustPressed(14);
    const dpadRight = this.isButtonJustPressed(15);

    if (dpadLeft) return -1;
    if (dpadRight) return 1;

    // Left stick snap navigation
    const lx = pad.leftStick.x;
    const prevMagnitude = Math.abs(this.prevButtons.length > 0 ? 0 : 0);

    if (Math.abs(lx) > 0.7 && prevMagnitude === 0) {
      // Use stick x but only when crossing the threshold
      const prevLx = this.prevStickX;
      if (Math.abs(prevLx) <= 0.7) {
        return lx > 0 ? 1 : -1;
      }
    }

    return 0;
  }

  private prevStickX: number = 0;

  /** Call at the end of each frame to snapshot button state. */
  updatePrevState(): void {
    const pad = this.getPad();
    if (!pad) {
      this.prevButtons = [];
      this.prevStickX = 0;
      return;
    }

    this.prevButtons = pad.buttons.map((b) => b.pressed);
    this.prevStickX = pad.leftStick.x;
  }
}
