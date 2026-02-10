import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYFIELD_RADIUS, COLORS, PX } from '../constants';
import LeaderboardManager from '../managers/LeaderboardManager';
import type { LeaderboardEntry } from '../types';

export default class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private finalLevel: number = 1;
  private leaderboardManager: LeaderboardManager;

  constructor() {
    super({ key: 'GameOverScene' });
    this.leaderboardManager = new LeaderboardManager();
  }

  init(data: { score: number; level: number }) {
    this.finalScore = data.score || 0;
    this.finalLevel = data.level || 1;
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background circle matching playfield aesthetic
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.playfield, 0.08);
    bg.fillCircle(centerX, centerY, PLAYFIELD_RADIUS * 0.7);
    bg.lineStyle(2 * PX, COLORS.playfield, 0.15);
    bg.strokeCircle(centerX, centerY, PLAYFIELD_RADIUS * 0.7);

    // Title
    const title = this.add.text(centerX, centerY - 380 * PX, 'GAME OVER', {
      fontSize: `${56 * PX}px`,
      color: '#ff4444',
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

    // Build merged leaderboard with the new score inserted at its correct position
    const existing = this.leaderboardManager.getTopScores(10);
    const newEntry: LeaderboardEntry = {
      name: '',
      score: this.finalScore,
      level: this.finalLevel,
      date: Date.now(),
    };
    const isHighScore = this.leaderboardManager.isHighScore(this.finalScore);

    const all: LeaderboardEntry[] = [...existing];
    let newScoreIndex = all.findIndex((e) => this.finalScore >= e.score);
    if (newScoreIndex === -1) newScoreIndex = all.length;
    all.splice(newScoreIndex, 0, newEntry);

    // Show 10 entries: if new score is in top 10, truncate to 10.
    // If not, show top 9 + the new score at its real position.
    let merged: LeaderboardEntry[];
    let realRanks: number[];
    if (newScoreIndex < 10) {
      merged = all.slice(0, 10);
      realRanks = merged.map((_, i) => i + 1);
    } else {
      merged = [...all.slice(0, 9), all[newScoreIndex]];
      realRanks = [1, 2, 3, 4, 5, 6, 7, 8, 9, newScoreIndex + 1];
      newScoreIndex = 9;
    }

    // Column headers
    const headerY = centerY - 290 * PX;
    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: `${18 * PX}px`,
      color: '#888888',
      fontFamily: "'Rajdhani', sans-serif",
    };

    const rankHeader = this.add.text(centerX - 280 * PX, headerY, '#', headerStyle);
    rankHeader.setOrigin(0, 0.5);

    const nameHeader = this.add.text(centerX - 220 * PX, headerY, 'NAME', headerStyle);
    nameHeader.setOrigin(0, 0.5);

    const levelHeader = this.add.text(centerX + 140 * PX, headerY, 'LVL', headerStyle);
    levelHeader.setOrigin(0.5, 0.5);

    const scoreHeader = this.add.text(centerX + 280 * PX, headerY, 'SCORE', headerStyle);
    scoreHeader.setOrigin(1, 0.5);

    // Header separator
    const headerLine = this.add.graphics();
    headerLine.lineStyle(1 * PX, 0x666666, 0.4);
    headerLine.beginPath();
    headerLine.moveTo(centerX - 290 * PX, headerY + 18 * PX);
    headerLine.lineTo(centerX + 290 * PX, headerY + 18 * PX);
    headerLine.strokePath();

    // Leaderboard entries
    const startY = centerY - 240 * PX;
    const rowHeight = 64 * PX;
    const fontSize = `${32 * PX}px`;

    let nameInput: HTMLInputElement | null = null;
    merged.forEach((entry, index) => {
      const isNew = index === newScoreIndex;
      const entryY = startY + index * rowHeight;
      const rankColor = isNew ? '#ffffff' : '#666666';
      const nameColor = isNew ? '#ffffff' : '#aaaaaa';
      const scoreColor = isNew ? '#ffffff' : '#aaaaaa';

      // Row background
      if (isNew) {
        const rowBg = this.add.graphics();
        rowBg.fillStyle(0xff4444, 0.1);
        rowBg.fillRect(
          centerX - 290 * PX,
          entryY - rowHeight / 2 + 4 * PX,
          580 * PX,
          rowHeight - 2 * PX
        );
      } else if (index % 2 === 0) {
        const rowBg = this.add.graphics();
        rowBg.fillStyle(0xffffff, 0.03);
        rowBg.fillRect(
          centerX - 290 * PX,
          entryY - rowHeight / 2 + 4 * PX,
          580 * PX,
          rowHeight - 2 * PX
        );
      }

      // Rank
      this.add
        .text(centerX - 270 * PX, entryY, `${realRanks[index]}`, {
          fontSize,
          color: rankColor,
          fontFamily: "'Rajdhani', sans-serif",
        })
        .setOrigin(0, 0.5);

      // Name
      if (isNew) {
        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.maxLength = 15;
        nameInput.placeholder = 'type name...';
        nameInput.value = '';
        Object.assign(nameInput.style, {
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: '400',
          fontSize: '32px',
          color: '#ffffff',
          background: 'transparent',
          border: 'none',
          borderBottom: '2px solid rgba(255,255,255,0.4)',
          outline: 'none',
          padding: '2px 0',
          width: '200px',
          caretColor: '#ffffff',
        });
        // Disable Phaser keyboard capture while typing
        nameInput.addEventListener('focus', () => {
          if (this.input.keyboard) this.input.keyboard.enabled = false;
        });
        nameInput.addEventListener('blur', () => {
          if (this.input.keyboard) this.input.keyboard.enabled = true;
        });
        nameInput.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && nameInput!.value.trim()) {
            if (isHighScore) {
              this.leaderboardManager.addScore(nameInput!.value.trim(), this.finalScore, this.finalLevel);
            }
            this.scene.start('MainMenuScene');
          }
        });
        const domEl = this.add.dom(centerX - 220 * PX, entryY, nameInput);
        domEl.setOrigin(0, 0.5);
        const inputRef = nameInput;
        this.time.delayedCall(50, () => inputRef.focus());
      } else {
        this.add
          .text(centerX - 220 * PX, entryY, entry.name, {
            fontSize,
            color: nameColor,
            fontFamily: "'Rajdhani', sans-serif",
          })
          .setOrigin(0, 0.5);
      }

      // Level
      this.add
        .text(centerX + 140 * PX, entryY, `${entry.level ?? '-'}`, {
          fontSize,
          color: isNew ? '#ffffff' : '#888888',
          fontFamily: "'Rajdhani', sans-serif",
        })
        .setOrigin(0.5, 0.5);

      // Score
      this.add
        .text(centerX + 280 * PX, entryY, `${entry.score}`, {
          fontSize,
          color: scoreColor,
          fontFamily: "'Rajdhani', sans-serif",
        })
        .setOrigin(1, 0.5);
    });

    // Confirm button positioned below the list
    const listBottom = startY + merged.length * rowHeight;
    const buttonY = listBottom + 80 * PX;

    const confirmButton = this.add.text(centerX, buttonY, 'CONFIRM', {
      fontSize: `${28 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
      backgroundColor: '#444444',
      padding: { x: 30 * PX, y: 12 * PX },
    });
    confirmButton.setOrigin(0.5);
    confirmButton.setInteractive({ useHandCursor: true });

    confirmButton.on('pointerover', () => {
      confirmButton.setStyle({ backgroundColor: '#666666' });
    });
    confirmButton.on('pointerout', () => {
      confirmButton.setStyle({ backgroundColor: '#444444' });
    });
    confirmButton.on('pointerdown', () => {
      if (nameInput) {
        const name = nameInput.value.trim();
        if (!name) return;
        if (isHighScore) {
          this.leaderboardManager.addScore(name, this.finalScore, this.finalLevel);
        }
      }
      this.scene.start('MainMenuScene');
    });
  }
}
