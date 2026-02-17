import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYFIELD_RADIUS, COLORS, PX } from '../constants';
import GamepadManager from '../managers/GamepadManager';

interface ControlEntry {
  action: string;
  keyboard: string;
  gamepad: string;
}

const GAMEPLAY_CONTROLS: ControlEntry[] = [
  { action: 'Aim', keyboard: 'Mouse position', gamepad: 'Left Stick' },
  { action: 'Shoot', keyboard: 'Left Click (hold)', gamepad: 'RB (hold)' },
  { action: 'Use Item 1', keyboard: '1', gamepad: 'A' },
  { action: 'Use Item 2', keyboard: '2', gamepad: 'B' },
  { action: 'Use Item 3', keyboard: '3', gamepad: 'X' },
  { action: 'Use Item 4', keyboard: '4', gamepad: 'Y' },
  { action: 'Pause', keyboard: 'ESC', gamepad: 'Start' },
];

const MENU_CONTROLS: ControlEntry[] = [
  { action: 'Navigate', keyboard: 'Mouse', gamepad: 'D-Pad' },
  { action: 'Select', keyboard: 'Click', gamepad: 'A / Start' },
  { action: 'Back', keyboard: 'Click', gamepad: 'B / Start' },
];

export default class ControlsScene extends Phaser.Scene {
  private gamepadManager!: GamepadManager;

  constructor() {
    super({ key: 'ControlsScene' });
  }

  create() {
    this.gamepadManager = new GamepadManager();

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background circle matching playfield aesthetic
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.playfield, 0.08);
    bg.fillCircle(centerX, centerY, PLAYFIELD_RADIUS * 0.7);
    bg.lineStyle(2 * PX, COLORS.playfield, 0.15);
    bg.strokeCircle(centerX, centerY, PLAYFIELD_RADIUS * 0.7);

    // Title
    const title = this.add.text(centerX, centerY - 440 * PX, 'CONTROLS', {
      fontSize: `${56 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(0.5);

    // Decorative line under title
    const line = this.add.graphics();
    line.lineStyle(2 * PX, COLORS.player, 0.6);
    line.beginPath();
    line.moveTo(centerX - 200 * PX, centerY - 400 * PX);
    line.lineTo(centerX + 200 * PX, centerY - 400 * PX);
    line.strokePath();

    // Column positions — 3 evenly spaced columns within the circle
    const tableWidth = 700 * PX;
    const colAction = centerX - tableWidth / 2 + 30 * PX;
    const colKeyboard = centerX - 60 * PX;
    const colGamepad = centerX + 200 * PX;

    // Gameplay section
    let currentY = centerY - 340 * PX;
    currentY = this.drawSection(
      'GAMEPLAY',
      GAMEPLAY_CONTROLS,
      currentY,
      centerX,
      tableWidth,
      colAction,
      colKeyboard,
      colGamepad
    );

    // Menu section
    currentY += 30 * PX;
    currentY = this.drawSection(
      'MENUS',
      MENU_CONTROLS,
      currentY,
      centerX,
      tableWidth,
      colAction,
      colKeyboard,
      colGamepad
    );

    // Back button
    const backY = currentY + 50 * PX;
    const backButton = this.add.text(centerX, backY, 'BACK', {
      fontSize: `${32 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
      backgroundColor: '#444444',
      padding: { x: 30 * PX, y: 12 * PX },
    });
    backButton.setOrigin(0.5);
    backButton.setInteractive({ useHandCursor: true });

    backButton.on('pointerover', () => {
      backButton.setStyle({ backgroundColor: '#666666' });
    });
    backButton.on('pointerout', () => {
      backButton.setStyle({ backgroundColor: '#444444' });
    });
    backButton.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private drawSection(
    sectionTitle: string,
    controls: ControlEntry[],
    startY: number,
    centerX: number,
    tableWidth: number,
    colAction: number,
    colKeyboard: number,
    colGamepad: number
  ): number {
    let y = startY;

    // Section label
    const sectionLabel = this.add.text(centerX, y, sectionTitle, {
      fontSize: `${28 * PX}px`,
      color: '#888888',
      fontFamily: "'Rajdhani', sans-serif",
    });
    sectionLabel.setOrigin(0.5);
    y += 55 * PX;

    // Column headers
    const headerStyle = {
      fontSize: `${22 * PX}px`,
      color: '#666666',
      fontFamily: "'Rajdhani', sans-serif",
    };

    const hAction = this.add.text(colAction, y, 'ACTION', headerStyle);
    hAction.setOrigin(0, 0.5);
    const hKeyboard = this.add.text(colKeyboard, y, 'KEYBOARD', headerStyle);
    hKeyboard.setOrigin(0, 0.5);
    const hGamepad = this.add.text(colGamepad, y, 'GAMEPAD', headerStyle);
    hGamepad.setOrigin(0, 0.5);
    y += 40 * PX;

    // Header separator line
    const headerLine = this.add.graphics();
    headerLine.lineStyle(1 * PX, 0xffffff, 0.1);
    headerLine.beginPath();
    headerLine.moveTo(centerX - tableWidth / 2, y - 28 * PX);
    headerLine.lineTo(centerX + tableWidth / 2, y - 28 * PX);
    headerLine.strokePath();

    // Rows
    const rowHeight = 56 * PX;
    const rowGfx = this.add.graphics();

    controls.forEach((entry, index) => {
      const rowY = y + index * rowHeight;

      // Alternating row background
      if (index % 2 === 0) {
        rowGfx.fillStyle(0xffffff, 0.03);
        rowGfx.fillRoundedRect(
          centerX - tableWidth / 2,
          rowY - rowHeight / 2 + 2 * PX,
          tableWidth,
          rowHeight - 4 * PX,
          6 * PX
        );
      }

      // Action label
      this.add
        .text(colAction, rowY, entry.action, {
          fontSize: `${28 * PX}px`,
          color: '#ffffff',
          fontFamily: "'Rajdhani', sans-serif",
        })
        .setOrigin(0, 0.5);

      // Keyboard binding
      this.add
        .text(colKeyboard, rowY, entry.keyboard, {
          fontSize: `${28 * PX}px`,
          color: '#aaaaaa',
          fontFamily: "'Rajdhani', sans-serif",
        })
        .setOrigin(0, 0.5);

      // Gamepad binding
      this.add
        .text(colGamepad, rowY, entry.gamepad, {
          fontSize: `${28 * PX}px`,
          color: '#aaaaaa',
          fontFamily: "'Rajdhani', sans-serif",
        })
        .setOrigin(0, 0.5);
    });

    return y + controls.length * rowHeight;
  }

  update() {
    if (this.gamepadManager.isBJustPressed() || this.gamepadManager.isStartJustPressed()) {
      this.scene.start('MainMenuScene');
    }

    this.gamepadManager.updatePrevState();
  }
}
