import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PX } from '../constants';
import LeaderboardManager from '../managers/LeaderboardManager';

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

    // Game Over title
    const title = this.add.text(centerX, centerY - 300 * PX, 'GAME OVER', {
      fontSize: `${64 * PX}px`,
      color: '#ff4444',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(0.5);

    // Final score
    const scoreText = this.add.text(
      centerX,
      centerY - 200 * PX,
      `Score: ${this.finalScore}   Level: ${this.finalLevel}`,
      {
        fontSize: `${32 * PX}px`,
        color: '#ffffff',
        fontFamily: "'Rajdhani', sans-serif",
      }
    );
    scoreText.setOrigin(0.5);

    // Leaderboard
    this.displayLeaderboard(centerX, centerY - 100 * PX);

    // Restart button
    const restartButton = this.add.text(centerX - 100 * PX, centerY + 200 * PX, 'RESTART', {
      fontSize: `${24 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
      backgroundColor: '#444444',
      padding: { x: 20 * PX, y: 10 * PX },
    });
    restartButton.setOrigin(0.5);
    restartButton.setInteractive({ useHandCursor: true });

    restartButton.on('pointerover', () => {
      restartButton.setStyle({ backgroundColor: '#666666' });
    });

    restartButton.on('pointerout', () => {
      restartButton.setStyle({ backgroundColor: '#444444' });
    });

    restartButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Main Menu button
    const menuButton = this.add.text(centerX + 100 * PX, centerY + 200 * PX, 'MAIN MENU', {
      fontSize: `${24 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
      backgroundColor: '#444444',
      padding: { x: 20 * PX, y: 10 * PX },
    });
    menuButton.setOrigin(0.5);
    menuButton.setInteractive({ useHandCursor: true });

    menuButton.on('pointerover', () => {
      menuButton.setStyle({ backgroundColor: '#666666' });
    });

    menuButton.on('pointerout', () => {
      menuButton.setStyle({ backgroundColor: '#444444' });
    });

    menuButton.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });

    // Add score to leaderboard if it's a high score
    if (this.leaderboardManager.isHighScore(this.finalScore)) {
      this.promptForName(centerX, centerY - 150 * PX);
    }
  }

  private displayLeaderboard(x: number, y: number) {
    const leaderboardTitle = this.add.text(x, y, 'LEADERBOARD', {
      fontSize: `${24 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    leaderboardTitle.setOrigin(0.5);

    // Column headers
    const headerY = y + 35 * PX;
    const headerStyle = {
      fontSize: `${14 * PX}px`,
      color: '#888888',
      fontFamily: "'Rajdhani', sans-serif",
    };

    const nameHeader = this.add.text(x - 180 * PX, headerY, 'NAME', headerStyle);
    nameHeader.setOrigin(0, 0.5);

    const levelHeader = this.add.text(x + 100 * PX, headerY, 'LVL', headerStyle);
    levelHeader.setOrigin(0.5, 0.5);

    const scoreHeader = this.add.text(x + 180 * PX, headerY, 'SCORE', headerStyle);
    scoreHeader.setOrigin(1, 0.5);

    const topScores = this.leaderboardManager.getTopScores(10);
    topScores.forEach((entry, index) => {
      const entryY = y + (55 + index * 28) * PX;
      const color = index < 3 ? '#ffffff' : '#aaaaaa';

      // Rank
      const rankText = this.add.text(x - 200 * PX, entryY, `${index + 1}.`, {
        fontSize: `${16 * PX}px`,
        color: index < 3 ? '#ba0000' : '#666666',
        fontFamily: "'Rajdhani', sans-serif",
      });
      rankText.setOrigin(0, 0.5);

      // Name
      const nameText = this.add.text(x - 180 * PX, entryY, entry.name, {
        fontSize: `${16 * PX}px`,
        color,
        fontFamily: "'Rajdhani', sans-serif",
      });
      nameText.setOrigin(0, 0.5);

      // Level
      const levelText = this.add.text(x + 100 * PX, entryY, `${entry.level ?? '-'}`, {
        fontSize: `${16 * PX}px`,
        color: '#888888',
        fontFamily: "'Rajdhani', sans-serif",
      });
      levelText.setOrigin(0.5, 0.5);

      // Score
      const scoreText = this.add.text(x + 180 * PX, entryY, `${entry.score}`, {
        fontSize: `${16 * PX}px`,
        color,
        fontFamily: "'Rajdhani', sans-serif",
      });
      scoreText.setOrigin(1, 0.5);
    });
  }

  private promptForName(x: number, y: number) {
    const promptText = this.add.text(x, y, 'New High Score! Enter your name:', {
      fontSize: `${18 * PX}px`,
      color: '#ffff00',
      fontFamily: "'Rajdhani', sans-serif",
    });
    promptText.setOrigin(0.5);

    // Create HTML input element for name entry
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.maxLength = 15;
    inputElement.placeholder = 'Enter name';
    inputElement.style.position = 'absolute';
    inputElement.style.left = '50%';
    inputElement.style.top = '50%';
    inputElement.style.transform = 'translate(-50%, -50%)';
    inputElement.style.fontSize = '20px';
    inputElement.style.padding = '10px';
    inputElement.style.textAlign = 'center';
    inputElement.style.border = '2px solid #ffff00';
    inputElement.style.backgroundColor = '#333';
    inputElement.style.color = '#fff';
    inputElement.style.outline = 'none';
    inputElement.style.zIndex = '1000';

    document.body.appendChild(inputElement);
    inputElement.focus();

    // Handle Enter key
    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const name = inputElement.value.trim() || 'Player';
        this.leaderboardManager.addScore(name, this.finalScore, this.finalLevel);
        document.body.removeChild(inputElement);
        this.scene.restart();
      }
    });

    // Remove input if user clicks elsewhere after 10 seconds
    this.time.delayedCall(10000, () => {
      if (document.body.contains(inputElement)) {
        const name = inputElement.value.trim() || 'Player';
        this.leaderboardManager.addScore(name, this.finalScore, this.finalLevel);
        document.body.removeChild(inputElement);
      }
    });
  }
}
