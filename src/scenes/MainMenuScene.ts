import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Title
    const title = this.add.text(centerX, centerY - 100, 'NOX POLARIS', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    title.setOrigin(0.5);

    // Start button
    const startButton = this.add.text(centerX, centerY + 50, 'START GAME', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#444444',
      padding: { x: 20, y: 10 },
    });
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setStyle({ backgroundColor: '#666666' });
    });

    startButton.on('pointerout', () => {
      startButton.setStyle({ backgroundColor: '#444444' });
    });

    startButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
