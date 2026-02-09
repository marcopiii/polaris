import Phaser from 'phaser';
import { BENCHMARK_MODE } from '../utils/BenchmarkConfig';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // TODO: Load audio assets when ready
    // this.load.audio('shoot', 'assets/audio/sfx/shoot.mp3');
    // etc.
  }

  create() {
    // Explicitly trigger Rajdhani font download and wait for it
    document.fonts.load("300 16px 'Rajdhani'").then(() => {
      this.scene.start(BENCHMARK_MODE ? 'GameScene' : 'MainMenuScene');
    });
  }
}
