import { GAMEPAD_DEADZONE_DEFAULT, GAMEPAD_DEADZONE_STORAGE_KEY } from '../constants';

export function loadGamepadDeadzone(): number {
  const stored = localStorage.getItem(GAMEPAD_DEADZONE_STORAGE_KEY);
  if (stored !== null) {
    const val = parseFloat(stored);
    if (!isNaN(val)) return val;
  }
  return GAMEPAD_DEADZONE_DEFAULT;
}

export function saveGamepadDeadzone(value: number): void {
  localStorage.setItem(GAMEPAD_DEADZONE_STORAGE_KEY, value.toFixed(2));
}

export default class GamepadManager {
  private prevButtons: boolean[] = [];
  private prevStickX: number = 0;
  private deadzone: number;

  constructor(deadzone?: number) {
    this.deadzone = deadzone ?? loadGamepadDeadzone();
  }

  private getPad(): Gamepad | null {
    const pads = navigator.getGamepads?.();
    if (!pads) return null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) return pads[i];
    }
    return null;
  }

  /** Returns the aim angle from the left stick, or null if within deadzone. */
  getAimAngle(): number | null {
    const pad = this.getPad();
    if (!pad) return null;

    const lx = pad.axes[0] ?? 0;
    const ly = pad.axes[1] ?? 0;
    const magnitude = Math.sqrt(lx * lx + ly * ly);

    if (magnitude < this.deadzone) return null;

    return Math.atan2(ly, lx);
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

  /** Returns true if B (button 1) was just pressed. */
  isBJustPressed(): boolean {
    return this.isButtonJustPressed(1);
  }

  /** Returns true if Start (button 9) was just pressed. */
  isStartJustPressed(): boolean {
    return this.isButtonJustPressed(9);
  }

  /** Returns true if D-pad Up (button 12) was just pressed. */
  isDpadUpJustPressed(): boolean {
    return this.isButtonJustPressed(12);
  }

  /** Returns true if D-pad Down (button 13) was just pressed. */
  isDpadDownJustPressed(): boolean {
    return this.isButtonJustPressed(13);
  }

  /** Returns true if D-pad Left (button 14) was just pressed. */
  isDpadLeftJustPressed(): boolean {
    return this.isButtonJustPressed(14);
  }

  /** Returns true if D-pad Right (button 15) was just pressed. */
  isDpadRightJustPressed(): boolean {
    return this.isButtonJustPressed(15);
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
    const lx = pad.axes[0] ?? 0;

    if (Math.abs(lx) > 0.7) {
      const prevLx = this.prevStickX;
      if (Math.abs(prevLx) <= 0.7) {
        return lx > 0 ? 1 : -1;
      }
    }

    return 0;
  }

  /** Triggers gamepad vibration if a pad is connected and supports it. */
  vibrate(duration: number, weakMagnitude: number = 0, strongMagnitude: number = 0.5): void {
    const pad = this.getPad();
    if (!pad) return;

    const actuator = pad.vibrationActuator as
      | { playEffect(type: string, params: object): void }
      | undefined;
    if (actuator?.playEffect) {
      actuator.playEffect('dual-rumble', {
        duration,
        weakMagnitude,
        strongMagnitude,
      });
    }
  }

  /** Call at the end of each frame to snapshot button state. */
  updatePrevState(): void {
    const pad = this.getPad();
    if (!pad) {
      this.prevButtons = [];
      this.prevStickX = 0;
      return;
    }

    this.prevButtons = pad.buttons.map((b) => b.pressed);
    this.prevStickX = pad.axes[0] ?? 0;
  }
}
