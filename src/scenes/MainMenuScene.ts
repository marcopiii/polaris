import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import logoHtml from './logo.html?raw';

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

  private createStartButton(x: number, y: number) {
    const button = document.createElement('button');
    button.textContent = 'START GAME';
    Object.assign(button.style, {
      fontFamily: "'Rajdhani', sans-serif",
      fontWeight: '300',
      fontSize: '32px',
      color: '#ffffff',
      background: '#444444',
      border: 'none',
      padding: '10px 20px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    });

    button.addEventListener('mouseenter', () => {
      button.style.background = '#666666';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = '#444444';
    });
    button.addEventListener('click', () => {
      this.scene.start('GameScene');
    });

    this.add.dom(x, y, button);
  }
}
