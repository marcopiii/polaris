import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYFIELD_RADIUS,
  TERMINAL_RADIUS_INITIAL,
  VISION_RADIUS_INITIAL,
  VISION_RADIUS_DECREASE,
  TERMINAL_RADIUS_INCREASE,
  COLORS,
  ENEMY_SIZE,
} from '../constants';
import Player from '../entities/Player';
import Enemy from '../entities/Enemy';
import Bullet from '../entities/Bullet';
import ScoreManager from '../managers/ScoreManager';
import LevelManager from '../managers/LevelManager';
import AudioManager from '../managers/AudioManager';
import { distance } from '../utils/MathUtils';
import { ParticleEffects } from '../utils/ParticleEffects';
import VisionBlurShader from '../shaders/VisionBlurShader';

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private scoreManager!: ScoreManager;
  private levelManager!: LevelManager;
  private audioManager!: AudioManager;

  private centerX!: number;
  private centerY!: number;
  private terminalRadius!: number;
  private visionRadius!: number;

  private playfieldGraphics!: Phaser.GameObjects.Graphics;
  private blurShader!: VisionBlurShader | null;
  private playfieldTremble: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.centerX = GAME_WIDTH / 2;
    this.centerY = GAME_HEIGHT / 2;
    this.terminalRadius = TERMINAL_RADIUS_INITIAL;
    this.visionRadius = VISION_RADIUS_INITIAL;

    // Initialize managers
    this.scoreManager = new ScoreManager();
    this.levelManager = new LevelManager();
    this.audioManager = new AudioManager(this);

    // Set up blur effect
    this.setupBlurEffect();

    // Draw playfield
    this.playfieldGraphics = this.add.graphics();
    this.drawPlayfield();

    // Create player
    this.player = new Player(this, this.centerX, this.centerY);

    // Start first level
    this.levelManager.startLevel(1);
  }

  private drawPlayfield() {
    this.playfieldGraphics.clear();

    // Draw playfield circle (with tremble offset)
    const trembleOffset =
      this.playfieldTremble > 0 ? (Math.random() - 0.5) * this.playfieldTremble : 0;
    this.playfieldGraphics.fillStyle(COLORS.playfield, 1);
    this.playfieldGraphics.fillCircle(this.centerX, this.centerY, PLAYFIELD_RADIUS + trembleOffset);

    // Draw vision radius edge (subtle indicator)
    if (this.visionRadius < PLAYFIELD_RADIUS) {
      this.playfieldGraphics.lineStyle(4, 0xffffff, 0.2);
      this.playfieldGraphics.strokeCircle(this.centerX, this.centerY, this.visionRadius);
    }

    // Draw terminal radius hint (danger zone)
    if (this.terminalRadius > 0) {
      this.playfieldGraphics.lineStyle(2, COLORS.terminalRadiusHint, 0.3);
      this.playfieldGraphics.strokeCircle(this.centerX, this.centerY, this.terminalRadius);
    }
  }

  private setupBlurEffect() {
    try {
      const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;

      if (renderer.type !== Phaser.WEBGL) {
        console.warn('WebGL not available, blur disabled');
        this.blurShader = null;
        return;
      }

      // Register the shader class (not instance)
      renderer.pipelines.addPostPipeline('VisionBlurShader', VisionBlurShader);

      // Apply shader to camera
      this.cameras.main.setPostPipeline('VisionBlurShader');

      // Get the pipeline instance from the camera
      this.blurShader = this.cameras.main.getPostPipeline('VisionBlurShader') as VisionBlurShader;

      // Initial values will be set in first update via updateBlurEffect
    } catch (error) {
      console.error('Failed to setup blur shader:', error);
      this.blurShader = null;
    }
  }

  private updateBlurEffect() {
    if (this.blurShader) {
      this.blurShader.setVisionParams(
        this.centerX,
        this.centerY,
        this.visionRadius,
        PLAYFIELD_RADIUS
      );
    }
  }

  update(time: number, delta: number) {
    // Update blur effect every frame
    this.updateBlurEffect();

    // Update player
    const shootInfo = this.player.update(time, delta);
    if (shootInfo.shouldShoot) {
      this.shoot(shootInfo.targetX, shootInfo.targetY);
    }

    // Update level manager and spawn enemies
    if (this.levelManager.update(delta)) {
      this.spawnEnemy();
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) {
        this.enemies.splice(i, 1);
        continue;
      }

      enemy.update(delta);

      // Check if enemy edge touched terminal radius
      if (enemy.getRadius() - ENEMY_SIZE < this.terminalRadius) {
        // Calculate contact point on terminal radius
        const enemyBounds = enemy.getBounds();
        const angle = Math.atan2(enemyBounds.y - this.centerY, enemyBounds.x - this.centerX);
        const contactX = this.centerX + Math.cos(angle) * this.terminalRadius;
        const contactY = this.centerY + Math.sin(angle) * this.terminalRadius;

        // Create particles at contact point
        ParticleEffects.createTerminalHitParticles(
          this,
          contactX,
          contactY,
          this.centerX,
          this.centerY
        );

        this.onEnemyReachedPlayer(enemy);
        this.enemies.splice(i, 1);
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.active) {
        this.bullets.splice(i, 1);
        continue;
      }

      bullet.update(delta);
    }

    // Check collisions
    this.checkCollisions();

    // Check level completion
    if (this.levelManager.isLevelComplete(this.enemies.length)) {
      this.levelManager.completeLevel();

      // Reset vision radius with smooth transition
      this.tweens.add({
        targets: this,
        visionRadius: VISION_RADIUS_INITIAL,
        duration: 300,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          this.drawPlayfield();
        },
      });

      // Audio feedback
      this.audioManager.playSound('terminalGrow'); // Reusing existing sound

      // White wave effect
      ParticleEffects.createLevelCompleteWave(this, this.centerX, this.centerY);

      // Playfield edge tremble
      this.playfieldTremble = 20;
      this.tweens.add({
        targets: this,
        playfieldTremble: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          this.drawPlayfield();
        },
      });

      // Start next level
      this.levelManager.startLevel(this.levelManager.getCurrentLevel() + 1);
    }

    // Check game over
    if (this.terminalRadius >= PLAYFIELD_RADIUS) {
      this.gameOver();
    }
  }

  private shoot(targetX: number, targetY: number) {
    const bullet = new Bullet(
      this,
      this.player.x,
      this.player.y,
      targetX,
      targetY,
      this.centerX,
      this.centerY
    );
    this.bullets.push(bullet);
    this.audioManager.playSound('shoot');
  }

  private spawnEnemy() {
    const randomAngle = Math.random() * Math.PI * 2;
    const enemy = new Enemy(this, randomAngle, this.centerX, this.centerY);
    this.enemies.push(enemy);
  }

  private checkCollisions() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.active) continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (!enemy.active) continue;

        const bulletBounds = bullet.getBounds();
        const enemyBounds = enemy.getBounds();
        const dist = distance(bulletBounds.x, bulletBounds.y, enemyBounds.x, enemyBounds.y);

        if (dist < bulletBounds.radius + enemyBounds.radius) {
          // Hit!
          const hitX = enemyBounds.x;
          const hitY = enemyBounds.y;

          bullet.destroy();
          enemy.destroy();
          this.bullets.splice(i, 1);
          this.enemies.splice(j, 1);
          this.scoreManager.addKill();
          this.audioManager.playSound('hit');

          // Particle effects
          ParticleEffects.createEnemyDeathParticles(this, hitX, hitY);
          ParticleEffects.createBulletHitParticles(this, hitX, hitY);
          break;
        }
      }
    }
  }

  private onEnemyReachedPlayer(enemy: Enemy) {
    enemy.destroy();
    const newVisionRadius = this.visionRadius - VISION_RADIUS_DECREASE;
    this.audioManager.playSound('damage');

    // Screen shake on damage
    this.cameras.main.shake(100, 0.005);

    if (newVisionRadius <= 0) {
      // Smoothly transition vision radius to 0, then reset
      this.tweens.add({
        targets: this,
        visionRadius: 0,
        duration: 200,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          this.drawPlayfield();
        },
        onComplete: () => {
          // Save old terminal radius before increasing
          const oldTerminalRadius = this.terminalRadius;
          const newTerminalRadius = this.terminalRadius + TERMINAL_RADIUS_INCREASE;

          this.audioManager.playSound('terminalGrow');

          // Strong screen shake for terminal grow
          this.cameras.main.shake(300, 0.01);

          // Smoothly increase terminal radius
          this.tweens.add({
            targets: this,
            terminalRadius: newTerminalRadius,
            duration: 300,
            ease: 'Quad.easeOut',
            onUpdate: () => {
              this.drawPlayfield();
            },
          });

          // Visual effect for terminal growth (starts from old radius)
          ParticleEffects.createTerminalGrowEffect(
            this,
            this.centerX,
            this.centerY,
            oldTerminalRadius
          );

          // Kill enemies progressively as wave reaches them
          const waveDuration = 500;
          const waveStart = oldTerminalRadius;
          const waveEnd = PLAYFIELD_RADIUS;
          const waveDistance = waveEnd - waveStart;

          for (const e of this.enemies) {
            const enemyDistance = e.getRadius();

            // Calculate when wave reaches this enemy
            if (enemyDistance >= waveStart && enemyDistance <= waveEnd) {
              const progress = (enemyDistance - waveStart) / waveDistance;
              const delay = progress * waveDuration;

              this.time.delayedCall(delay, () => {
                if (e.active) {
                  const bounds = e.getBounds();
                  ParticleEffects.createEnemyDeathParticles(this, bounds.x, bounds.y);
                  e.destroy();
                }
              });
            } else {
              // Enemy outside wave range, destroy immediately
              e.destroy();
            }
          }

          // Clear enemy array after wave completes
          this.time.delayedCall(waveDuration, () => {
            this.enemies = this.enemies.filter((e) => e.active);
          });

          // Smoothly transition back to full vision
          this.tweens.add({
            targets: this,
            visionRadius: VISION_RADIUS_INITIAL,
            duration: 200,
            ease: 'Quad.easeOut',
            onUpdate: () => {
              this.drawPlayfield();
            },
          });
        },
      });
    } else {
      // Smoothly decrease vision radius
      this.tweens.add({
        targets: this,
        visionRadius: newVisionRadius,
        duration: 200,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          this.drawPlayfield();
        },
      });
    }
  }

  private gameOver() {
    this.audioManager.playSound('gameOver');
    this.scene.start('GameOverScene', { score: this.scoreManager.getScore() });
  }
}
