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
    // Explicitly trigger download of both Rajdhani weights and wait for them
    Promise.all([
      document.fonts.load("300 16px 'Rajdhani'"),
      document.fonts.load("400 16px 'Rajdhani'"),
    ]).then(() => {
      if (BENCHMARK_MODE) {
        this.scene.start('GameScene');
        return;
      }

      // Debug: ?scene=gameover&score=1234&level=5 jumps straight to GameOverScene
      const params = new URLSearchParams(window.location.search);
      const debugScene = params.get('scene');
      if (debugScene === 'gameover') {
        const score = parseInt(params.get('score') ?? '0', 10);
        const level = parseInt(params.get('level') ?? '1', 10);
        this.scene.start('GameOverScene', { score, level });
      } else if (debugScene === 'leaderboard') {
        this.scene.start('LeaderboardScene');
      } else if (debugScene === 'settings') {
        this.scene.start('SettingsScene');
      } else {
        this.scene.start('MainMenuScene');
      }
    });
  }
}
