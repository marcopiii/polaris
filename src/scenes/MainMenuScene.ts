import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import logoHtml from './logo.html?raw';

const LOGO_FONT_FAMILY = "'Rajdhani', sans-serif";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.createLogo(centerX, centerY - 120);
    this.createStartButton(centerX, centerY + 80);
  }

  private createLogo(x: number, y: number) {
    const el = document.createElement('div');
    el.innerHTML = logoHtml;

    this.add.dom(x, y, el);
  }

  private createStartButton(centerX: number, centerY: number) {
    const startButton = this.add.text(centerX, centerY, 'START GAME', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: LOGO_FONT_FAMILY,
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
