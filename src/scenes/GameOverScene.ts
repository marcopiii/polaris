import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import LeaderboardManager from '../managers/LeaderboardManager';

export default class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private leaderboardManager: LeaderboardManager;

  constructor() {
    super({ key: 'GameOverScene' });
    this.leaderboardManager = new LeaderboardManager();
  }

  init(data: { score: number }) {
    this.finalScore = data.score || 0;
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Game Over title
    const title = this.add.text(centerX, centerY - 300, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff4444',
      fontFamily: 'Arial, sans-serif',
    });
    title.setOrigin(0.5);

    // Final score
    const scoreText = this.add.text(centerX, centerY - 200, `Score: ${this.finalScore}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    scoreText.setOrigin(0.5);

    // Leaderboard
    this.displayLeaderboard(centerX, centerY - 100);

    // Restart button
    const restartButton = this.add.text(centerX - 100, centerY + 200, 'RESTART', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#444444',
      padding: { x: 20, y: 10 },
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
    const menuButton = this.add.text(centerX + 100, centerY + 200, 'MAIN MENU', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#444444',
      padding: { x: 20, y: 10 },
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
      this.promptForName(centerX, centerY - 150);
    }
  }

  private displayLeaderboard(x: number, y: number) {
    const leaderboardTitle = this.add.text(x, y, 'LEADERBOARD', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    leaderboardTitle.setOrigin(0.5);

    const topScores = this.leaderboardManager.getTopScores(10);
    topScores.forEach((entry, index) => {
      const entryText = this.add.text(
        x,
        y + 40 + index * 30,
        `${index + 1}. ${entry.name.padEnd(15)} ${entry.score}`,
        {
          fontSize: '18px',
          color: '#cccccc',
          fontFamily: 'Courier, monospace',
        }
      );
      entryText.setOrigin(0.5);
    });
  }

  private promptForName(x: number, y: number) {
    const promptText = this.add.text(x, y, 'New High Score! Enter your name:', {
      fontSize: '18px',
      color: '#ffff00',
      fontFamily: 'Arial, sans-serif',
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
        this.leaderboardManager.addScore(name, this.finalScore);
        document.body.removeChild(inputElement);
        this.scene.restart();
      }
    });

    // Remove input if user clicks elsewhere after 10 seconds
    this.time.delayedCall(10000, () => {
      if (document.body.contains(inputElement)) {
        const name = inputElement.value.trim() || 'Player';
        this.leaderboardManager.addScore(name, this.finalScore);
        document.body.removeChild(inputElement);
      }
    });
  }
}
