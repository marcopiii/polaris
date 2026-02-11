import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYFIELD_RADIUS,
  COLORS,
  PX,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_STORAGE_KEY,
  SCORE_MULTIPLIER,
  type Difficulty,
} from '../constants';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'EASY',
  normal: 'NORMAL',
  hard: 'HARD',
  madness: 'MADNESS',
};

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: 'Fewer enemies, weaker tiers',
  normal: 'The standard experience',
  hard: 'More enemies, stronger tiers',
  madness: 'Relentless swarms of elites',
};

export default class SettingsScene extends Phaser.Scene {
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private rowElements: {
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    mult: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
  }[] = [];

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    const stored = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    this.selectedDifficulty = (stored as Difficulty) || DEFAULT_DIFFICULTY;

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background circle matching playfield aesthetic
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.playfield, 0.08);
    bg.fillCircle(centerX, centerY, PLAYFIELD_RADIUS * 0.7);
    bg.lineStyle(2 * PX, COLORS.playfield, 0.15);
    bg.strokeCircle(centerX, centerY, PLAYFIELD_RADIUS * 0.7);

    // Title
    const title = this.add.text(centerX, centerY - 380 * PX, 'SETTINGS', {
      fontSize: `${56 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(0.5);

    // Decorative line under title
    const line = this.add.graphics();
    line.lineStyle(2 * PX, COLORS.player, 0.6);
    line.beginPath();
    line.moveTo(centerX - 200 * PX, centerY - 340 * PX);
    line.lineTo(centerX + 200 * PX, centerY - 340 * PX);
    line.strokePath();

    // Section label
    const sectionLabel = this.add.text(centerX, centerY - 290 * PX, 'DIFFICULTY', {
      fontSize: `${22 * PX}px`,
      color: '#888888',
      fontFamily: "'Rajdhani', sans-serif",
    });
    sectionLabel.setOrigin(0.5);

    // Difficulty rows
    const startY = centerY - 200 * PX;
    const rowHeight = 100 * PX;
    const rowWidth = 500 * PX;

    DIFFICULTIES.forEach((diff, index) => {
      const rowY = startY + index * rowHeight;
      const isSelected = diff === this.selectedDifficulty;

      // Row background
      const rowBg = this.add.graphics();
      this.drawRow(rowBg, centerX, rowY, rowWidth, rowHeight, diff, isSelected);

      // Difficulty label
      const label = this.add.text(centerX - rowWidth / 2 + 30 * PX, rowY, DIFFICULTY_LABELS[diff], {
        fontSize: `${32 * PX}px`,
        color: isSelected ? '#ffffff' : '#aaaaaa',
        fontFamily: "'Rajdhani', sans-serif",
      });
      label.setOrigin(0, 0.5);

      // Description
      const desc = this.add.text(
        centerX - rowWidth / 2 + 30 * PX,
        rowY + 22 * PX,
        DIFFICULTY_DESCRIPTIONS[diff],
        {
          fontSize: `${16 * PX}px`,
          color: isSelected ? '#aaaaaa' : '#666666',
          fontFamily: "'Rajdhani', sans-serif",
        }
      );
      desc.setOrigin(0, 0.5);

      // Score multiplier
      const mult = this.add.text(
        centerX + rowWidth / 2 - 30 * PX,
        rowY,
        `x${SCORE_MULTIPLIER[diff]}`,
        {
          fontSize: `${28 * PX}px`,
          color: isSelected ? '#ffffff' : '#888888',
          fontFamily: "'Rajdhani', sans-serif",
        }
      );
      mult.setOrigin(1, 0.5);

      // Interactive hit area
      const hitArea = this.add.rectangle(
        centerX,
        rowY + 5 * PX,
        rowWidth,
        rowHeight - 8 * PX,
        0x000000,
        0
      );
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on('pointerover', () => {
        if (diff !== this.selectedDifficulty) {
          rowBg.clear();
          this.drawRow(rowBg, centerX, rowY, rowWidth, rowHeight, diff, false, true);
        }
      });

      hitArea.on('pointerout', () => {
        rowBg.clear();
        this.drawRow(
          rowBg,
          centerX,
          rowY,
          rowWidth,
          rowHeight,
          diff,
          diff === this.selectedDifficulty
        );
      });

      hitArea.on('pointerdown', () => {
        this.selectDifficulty(diff);
      });

      this.rowElements.push({ bg: rowBg, label, desc, mult, hitArea });
    });

    // Back button
    const backY = startY + DIFFICULTIES.length * rowHeight + 60 * PX;
    const backButton = this.add.text(centerX, backY, 'BACK', {
      fontSize: `${28 * PX}px`,
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

  private selectDifficulty(diff: Difficulty) {
    this.selectedDifficulty = diff;
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, diff);

    const centerX = GAME_WIDTH / 2;
    const startY = GAME_HEIGHT / 2 - 200 * PX;
    const rowHeight = 100 * PX;
    const rowWidth = 500 * PX;

    DIFFICULTIES.forEach((d, i) => {
      const rowY = startY + i * rowHeight;
      const isSelected = d === diff;
      const row = this.rowElements[i];

      row.bg.clear();
      this.drawRow(row.bg, centerX, rowY, rowWidth, rowHeight, d, isSelected);
      row.label.setColor(isSelected ? '#ffffff' : '#aaaaaa');
      row.desc.setColor(isSelected ? '#aaaaaa' : '#666666');
      row.mult.setColor(isSelected ? '#ffffff' : '#888888');
    });
  }

  private drawRow(
    gfx: Phaser.GameObjects.Graphics,
    centerX: number,
    rowY: number,
    rowWidth: number,
    rowHeight: number,
    _diff: Difficulty,
    isSelected: boolean,
    isHover: boolean = false
  ) {
    const x = centerX - rowWidth / 2;
    const y = rowY - rowHeight / 2 + 8 * PX;
    const w = rowWidth;
    const h = rowHeight - 8 * PX;
    const r = 8 * PX;

    if (isSelected) {
      gfx.fillStyle(COLORS.player, 0.15);
      gfx.fillRoundedRect(x, y, w, h, r);
      gfx.lineStyle(2 * PX, COLORS.player, 0.6);
      gfx.strokeRoundedRect(x, y, w, h, r);
    } else if (isHover) {
      gfx.fillStyle(0xffffff, 0.06);
      gfx.fillRoundedRect(x, y, w, h, r);
      gfx.lineStyle(1 * PX, 0xffffff, 0.15);
      gfx.strokeRoundedRect(x, y, w, h, r);
    } else {
      gfx.fillStyle(0xffffff, 0.03);
      gfx.fillRoundedRect(x, y, w, h, r);
    }
  }
}
