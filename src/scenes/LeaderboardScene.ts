import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYFIELD_RADIUS, COLORS, PX } from '../constants';
import LeaderboardManager from '../managers/LeaderboardManager';
import GamepadManager from '../managers/GamepadManager';

export default class LeaderboardScene extends Phaser.Scene {
  private leaderboardManager: LeaderboardManager;
  private gamepadManager!: GamepadManager;

  constructor() {
    super({ key: 'LeaderboardScene' });
    this.leaderboardManager = new LeaderboardManager();
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
    const title = this.add.text(centerX, centerY - 380 * PX, 'LEADERBOARD', {
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
    const topScores = this.leaderboardManager.getTopScores(10);
    const startY = centerY - 240 * PX;
    const rowHeight = 64 * PX;

    if (topScores.length === 0) {
      const emptyText = this.add.text(centerX, centerY, 'No scores yet. Play a game!', {
        fontSize: `${24 * PX}px`,
        color: '#666666',
        fontFamily: "'Rajdhani', sans-serif",
      });
      emptyText.setOrigin(0.5);
    } else {
      topScores.forEach((entry, index) => {
        const entryY = startY + index * rowHeight;

        // Alternating row background
        if (index % 2 === 0) {
          const rowBg = this.add.graphics();
          rowBg.fillStyle(0xffffff, 0.03);
          rowBg.fillRect(
            centerX - 290 * PX,
            entryY - rowHeight / 2 + 4 * PX,
            580 * PX,
            rowHeight - 2 * PX
          );
        }

        // Top 3 get special colors
        const isTop3 = index < 3;
        const rankColor = isTop3 ? '#ffffff' : '#666666';
        const nameColor = isTop3 ? '#ffffff' : '#aaaaaa';
        const scoreColor = isTop3 ? '#ffffff' : '#aaaaaa';
        const fontSize = `${32 * PX}px`;

        // Rank
        const rankText = this.add.text(centerX - 270 * PX, entryY, `${index + 1}`, {
          fontSize,
          color: rankColor,
          fontFamily: "'Rajdhani', sans-serif",
        });
        rankText.setOrigin(0, 0.5);

        // Name
        const nameText = this.add.text(centerX - 220 * PX, entryY, entry.name, {
          fontSize,
          color: nameColor,
          fontFamily: "'Rajdhani', sans-serif",
        });
        nameText.setOrigin(0, 0.5);

        // Level
        const levelText = this.add.text(centerX + 140 * PX, entryY, `${entry.level ?? '-'}`, {
          fontSize,
          color: '#888888',
          fontFamily: "'Rajdhani', sans-serif",
        });
        levelText.setOrigin(0.5, 0.5);

        // Score
        const scoreText = this.add.text(centerX + 280 * PX, entryY, `${entry.score}`, {
          fontSize,
          color: scoreColor,
          fontFamily: "'Rajdhani', sans-serif",
        });
        scoreText.setOrigin(1, 0.5);
      });
    }

    // Back button positioned below the list
    const listBottom = startY + Math.max(topScores.length, 1) * rowHeight;
    const backButton = this.add.text(centerX, listBottom + 80 * PX, 'BACK', {
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

  update() {
    if (
      this.gamepadManager.isBJustPressed() ||
      this.gamepadManager.isAJustPressed() ||
      this.gamepadManager.isStartJustPressed()
    ) {
      this.scene.start('MainMenuScene');
    }
    this.gamepadManager.updatePrevState();
  }
}
