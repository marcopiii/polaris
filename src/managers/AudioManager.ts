import Phaser from 'phaser';
import { AudioGenerator } from '../utils/AudioGenerator';

export default class AudioManager {
  private audioGenerator: AudioGenerator;
  private enabled: boolean = true;

  constructor(_scene: Phaser.Scene) {
    this.audioGenerator = new AudioGenerator();
  }

  playSound(key: string) {
    if (!this.enabled) return;

    try {
      switch (key) {
        case 'shoot':
          this.audioGenerator.playShoot();
          break;
        case 'hit':
          this.audioGenerator.playHit();
          break;
        case 'damage':
          this.audioGenerator.playDamage();
          break;
        case 'terminalGrow':
          this.audioGenerator.playTerminalGrow();
          break;
        case 'terminalShrink':
          this.audioGenerator.playTerminalShrink();
          break;
        case 'gameOver':
          this.audioGenerator.playGameOver();
          break;
        case 'lightning':
          this.audioGenerator.playLightning();
          break;
        case 'laser':
          this.audioGenerator.playLaser();
          break;
        case 'shieldHit':
          this.audioGenerator.playShieldHit();
          break;
        case 'shieldDestroy':
          this.audioGenerator.playShieldDestroy();
          break;
        case 'orbitalPip':
          this.audioGenerator.playOrbitalPip();
          break;
      }
    } catch (error) {
      console.warn('Audio playback failed:', error);
      this.enabled = false;
    }
  }

  stopSound(key: string) {
    try {
      switch (key) {
        case 'laser':
          this.audioGenerator.stopLaser();
          break;
      }
    } catch (error) {
      console.warn('Audio stop failed:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(value: number) {
    this.audioGenerator.setVolume(value);
  }
}
