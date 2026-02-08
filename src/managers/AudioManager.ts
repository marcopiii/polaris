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
        case 'gameOver':
          this.audioGenerator.playGameOver();
          break;
        case 'lightning':
          this.audioGenerator.playLightning();
          break;
      }
    } catch (error) {
      console.warn('Audio playback failed:', error);
      this.enabled = false;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}
