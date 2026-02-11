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
  GAMEPAD_DEADZONE_DEFAULT,
  type Difficulty,
} from '../constants';
import GamepadManager, {
  loadGamepadDeadzone,
  saveGamepadDeadzone,
} from '../managers/GamepadManager';

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

const DEADZONE_STEP = 0.05;
const DEADZONE_MIN = 0.05;
const DEADZONE_MAX = 0.9;

export default class SettingsScene extends Phaser.Scene {
  private gamepadManager!: GamepadManager;
  private selectedDifficulty: Difficulty = DEFAULT_DIFFICULTY;
  private highlightedIndex: number = 0;
  private rowElements: {
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    mult: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
  }[] = [];

  // Deadzone slider
  private deadzoneValue: number = GAMEPAD_DEADZONE_DEFAULT;
  private deadzoneValueText!: Phaser.GameObjects.Text;
  private deadzoneTrackGfx!: Phaser.GameObjects.Graphics;
  private deadzoneTrackX: number = 0;
  private deadzoneTrackY: number = 0;
  private deadzoneTrackW: number = 0;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this.gamepadManager = new GamepadManager();
    this.rowElements = [];
    const stored = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    this.selectedDifficulty = (stored as Difficulty) || DEFAULT_DIFFICULTY;
    this.highlightedIndex = DIFFICULTIES.indexOf(this.selectedDifficulty);
    this.deadzoneValue = loadGamepadDeadzone();

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

    // ─── Deadzone Slider ──────────────────────────────────────────────────
    const dzSectionY = startY + DIFFICULTIES.length * rowHeight + 40 * PX;

    const dzLabel = this.add.text(centerX, dzSectionY, 'STICK DEADZONE', {
      fontSize: `${22 * PX}px`,
      color: '#888888',
      fontFamily: "'Rajdhani', sans-serif",
    });
    dzLabel.setOrigin(0.5);

    const trackY = dzSectionY + 50 * PX;
    const trackW = 400 * PX;
    const trackX = centerX - trackW / 2;

    this.deadzoneTrackX = trackX;
    this.deadzoneTrackY = trackY;
    this.deadzoneTrackW = trackW;

    this.deadzoneTrackGfx = this.add.graphics();
    this.drawDeadzoneTrack();

    this.deadzoneValueText = this.add.text(
      centerX + trackW / 2 + 30 * PX,
      trackY,
      this.formatDeadzone(),
      {
        fontSize: `${28 * PX}px`,
        color: '#ffffff',
        fontFamily: "'Rajdhani', sans-serif",
      }
    );
    this.deadzoneValueText.setOrigin(0, 0.5);

    // Left / right arrow buttons
    const arrowStyle = {
      fontSize: `${36 * PX}px`,
      color: '#aaaaaa',
      fontFamily: "'Rajdhani', sans-serif",
    };

    const leftArrow = this.add.text(trackX - 30 * PX, trackY, '<', arrowStyle);
    leftArrow.setOrigin(0.5);
    leftArrow.setInteractive({ useHandCursor: true });
    leftArrow.on('pointerover', () => leftArrow.setColor('#ffffff'));
    leftArrow.on('pointerout', () => leftArrow.setColor('#aaaaaa'));
    leftArrow.on('pointerdown', () => this.adjustDeadzone(-DEADZONE_STEP));

    const rightArrow = this.add.text(centerX + trackW / 2 + 10 * PX, trackY, '>', arrowStyle);
    rightArrow.setOrigin(0.5);
    rightArrow.setInteractive({ useHandCursor: true });
    rightArrow.on('pointerover', () => rightArrow.setColor('#ffffff'));
    rightArrow.on('pointerout', () => rightArrow.setColor('#aaaaaa'));
    rightArrow.on('pointerdown', () => this.adjustDeadzone(DEADZONE_STEP));

    // Clickable track for direct positioning
    const trackHit = this.add.rectangle(centerX, trackY, trackW, 30 * PX, 0x000000, 0);
    trackHit.setInteractive({ useHandCursor: true });
    trackHit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const pct = Phaser.Math.Clamp((pointer.x - trackX) / trackW, 0, 1);
      const raw = DEADZONE_MIN + pct * (DEADZONE_MAX - DEADZONE_MIN);
      this.setDeadzone(Math.round(raw / DEADZONE_STEP) * DEADZONE_STEP);
    });

    // Back button
    const backY = trackY + 70 * PX;
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

  private formatDeadzone(): string {
    return this.deadzoneValue.toFixed(2);
  }

  private drawDeadzoneTrack() {
    const gfx = this.deadzoneTrackGfx;
    const x = this.deadzoneTrackX;
    const y = this.deadzoneTrackY;
    const w = this.deadzoneTrackW;
    const h = 8 * PX;
    const r = 4 * PX;

    gfx.clear();

    // Track background
    gfx.fillStyle(0xffffff, 0.1);
    gfx.fillRoundedRect(x, y - h / 2, w, h, r);

    // Fill up to current value
    const pct = (this.deadzoneValue - DEADZONE_MIN) / (DEADZONE_MAX - DEADZONE_MIN);
    const fillW = Math.max(h, pct * w);
    gfx.fillStyle(COLORS.player, 0.6);
    gfx.fillRoundedRect(x, y - h / 2, fillW, h, r);

    // Thumb
    const thumbX = x + pct * w;
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(thumbX, y, 10 * PX);
  }

  private adjustDeadzone(delta: number) {
    this.setDeadzone(this.deadzoneValue + delta);
  }

  private setDeadzone(value: number) {
    this.deadzoneValue = Phaser.Math.Clamp(
      Math.round(value / DEADZONE_STEP) * DEADZONE_STEP,
      DEADZONE_MIN,
      DEADZONE_MAX
    );
    saveGamepadDeadzone(this.deadzoneValue);
    this.deadzoneValueText.setText(this.formatDeadzone());
    this.drawDeadzoneTrack();
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

  private updateHighlight() {
    const centerX = GAME_WIDTH / 2;
    const startY = GAME_HEIGHT / 2 - 200 * PX;
    const rowHeight = 100 * PX;
    const rowWidth = 500 * PX;

    DIFFICULTIES.forEach((d, i) => {
      const rowY = startY + i * rowHeight;
      const isSelected = d === this.selectedDifficulty;
      const isHighlighted = i === this.highlightedIndex && !isSelected;
      const row = this.rowElements[i];

      row.bg.clear();
      this.drawRow(row.bg, centerX, rowY, rowWidth, rowHeight, d, isSelected, isHighlighted);
    });
  }

  update() {
    if (this.gamepadManager.isDpadDownJustPressed()) {
      this.highlightedIndex = (this.highlightedIndex + 1) % DIFFICULTIES.length;
      this.updateHighlight();
    } else if (this.gamepadManager.isDpadUpJustPressed()) {
      this.highlightedIndex =
        (this.highlightedIndex - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
      this.updateHighlight();
    }

    // D-pad left/right adjusts deadzone
    if (this.gamepadManager.isDpadLeftJustPressed()) {
      this.adjustDeadzone(-DEADZONE_STEP);
    } else if (this.gamepadManager.isDpadRightJustPressed()) {
      this.adjustDeadzone(DEADZONE_STEP);
    }

    if (this.gamepadManager.isAJustPressed()) {
      this.selectDifficulty(DIFFICULTIES[this.highlightedIndex]);
    }

    if (this.gamepadManager.isBJustPressed() || this.gamepadManager.isStartJustPressed()) {
      this.scene.start('MainMenuScene');
    }

    this.gamepadManager.updatePrevState();
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
