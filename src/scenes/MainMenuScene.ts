import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

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
    const logoHtml = `
      <div style="
        display: flex;
        align-items: center;
        user-select: none;
      ">
        <span style="
          font-family: 'Rajdhani', sans-serif;
          font-weight: 300;
          font-size: 128px;
          color: #ffffff;
          letter-spacing: 0;
          line-height: 1;
          text-transform: uppercase;
          text-shadow:
            0 0 8px rgba(255, 255, 255, 0.6),
            0 0 25px rgba(255, 255, 255, 0.35),
            0 0 60px rgba(255, 255, 255, 0.2),
            0 0 120px rgba(255, 255, 255, 0.1);
        ">P</span>
        <div style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 90px;
          height: 90px;
          position: relative;
          margin: 0 20px;
          margin-bottom: 6px;
        ">
          <div style="
            position: absolute;
            width: 88px;
            height: 88px;
            border-radius: 50%;
            border: 2px solid #ba0000;
            box-shadow:
              0 0 12px rgba(186, 0, 0, 0.5),
              0 0 35px rgba(186, 0, 0, 0.3),
              0 0 70px rgba(186, 0, 0, 0.15);
          "></div>
          <div style="
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #ba0000;
            position: relative;
            z-index: 1;
            box-shadow:
              0 0 10px rgba(186, 0, 0, 0.7),
              0 0 30px rgba(186, 0, 0, 0.4),
              0 0 60px rgba(186, 0, 0, 0.2);
          "></div>
        </div>
        <span style="
          font-family: 'Rajdhani', sans-serif;
          font-weight: 300;
          font-size: 128px;
          color: #ffffff;
          letter-spacing: 0.22em;
          line-height: 1;
          text-transform: uppercase;
          text-shadow:
            0 0 8px rgba(255, 255, 255, 0.6),
            0 0 25px rgba(255, 255, 255, 0.35),
            0 0 60px rgba(255, 255, 255, 0.2),
            0 0 120px rgba(255, 255, 255, 0.1);
        ">LARIS</span>
      </div>
    `;

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
