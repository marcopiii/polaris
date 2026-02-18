import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYFIELD_RADIUS,
  TERMINAL_RADIUS_INITIAL,
  VISION_RADIUS_INITIAL,
  TERMINAL_RADIUS_INCREASE,
  COLORS,
  ENEMY_SPEED,
  ENEMY_LEVEL_EXP,
  ENEMY_LEVEL_GAP,
  LASER_BEAM_DURATION,
  LASER_BEAM_HALF_ANGLE,
  LASER_MAX_ANGULAR_SPEED,
  SHIELD_MAX_SLOTS,
  SHIELD_ORBIT_SPEED,
  HUD_FONT_PRIMARY,
  HUD_FONT_SECONDARY,
  PX,
  DIFFICULTY_STORAGE_KEY,
  DEFAULT_DIFFICULTY,
  type Difficulty,
} from '../constants';
import Player from '../entities/Player';
import Enemy from '../entities/Enemy';
import Bullet from '../entities/Bullet';
import OrbitalShield from '../entities/OrbitalShield';
import SweepShot from '../entities/SweepShot';
import OrbitalFlare from '../entities/OrbitalFlare';
import OrbitalBullet from '../entities/OrbitalBullet';
import ScoreManager from '../managers/ScoreManager';
import LevelManager from '../managers/LevelManager';
import AudioManager from '../managers/AudioManager';
import PowerUpManager, {
  PowerUpType,
  RARITY_COLORS,
  CONSUMABLE_MATTER_COST,
  MAX_EQUIPPED_SLOTS,
  MAX_CONSUMABLE_INVENTORY,
  getConsumableDefinition,
  type PowerUpDefinition,
} from '../managers/PowerUpManager';
import GamepadManager from '../managers/GamepadManager';
import { SpawnDistribution } from '../systems/SpawnDistribution';
import { distance, distPointToSegment } from '../utils/MathUtils';
import { ParticleEffects } from '../utils/ParticleEffects';
import VisionBlurShader from '../shaders/VisionBlurShader';
import {
  gameRandom,
  BENCHMARK_MODE,
  BENCHMARK_SEED,
  START_LEVEL,
  parsePowerUpsParam,
} from '../utils/BenchmarkConfig';

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private shields: OrbitalShield[] = [];
  private sweepShots: SweepShot[] = [];
  private orbitalFlares: OrbitalFlare[] = [];
  private orbitalBullets: OrbitalBullet[] = [];
  private shieldRotation: number = 0;
  private scoreManager!: ScoreManager;
  private levelManager!: LevelManager;
  private spawnDistribution!: SpawnDistribution;
  private audioManager!: AudioManager;
  private powerUpManager!: PowerUpManager;
  private gamepadManager!: GamepadManager;

  private centerX!: number;
  private centerY!: number;
  private terminalRadius!: number;
  private visionRadius!: number;

  private playfieldGraphics!: Phaser.GameObjects.Graphics;
  private blurShader!: VisionBlurShader | null;
  private playfieldTremble: number = 0;
  private isPaused: boolean = false;
  private pauseUIElements: Phaser.GameObjects.GameObject[] = [];
  private pauseButton!: Phaser.GameObjects.Text;
  private escKey!: Phaser.Input.Keyboard.Key;
  private playfieldVisualRadius: number = PLAYFIELD_RADIUS;
  private savedTerminalRadius: number = 0;
  private isPowerUpSelectionActive: boolean = false;
  private powerUpUIElements: Phaser.GameObjects.GameObject[] = [];
  private powerUpSelectedIndex: number = 0;
  private powerUpItemTexts: { name: Phaser.GameObjects.Text; rarity: Phaser.GameObjects.Text }[] =
    [];
  private powerUpSelectionData: {
    selection: PowerUpDefinition[];
    nextLevel: number;
    angles: number[];
    shrinkAvailable: boolean;
  } = {
    selection: [],
    nextLevel: 0,
    angles: [],
    shrinkAvailable: false,
  };

  // Consumable state
  private laserBeamTimer: number = 0;
  private laserGraphics!: Phaser.GameObjects.Graphics;
  private laserSparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private slotHudElements: Phaser.GameObjects.Text[] = [];

  // Background dust particles
  private dustParticles: { r: number; theta: number }[] = [];
  private dustSpawnTimer: number = 0;
  private dustSpawnBatch: number = 0;
  private dustGraphics!: Phaser.GameObjects.Graphics;
  private aimingDotGraphics!: Phaser.GameObjects.Graphics;
  private aimingDotVisible: boolean = false;

  // Consumable shop state
  private shopUIElements: Phaser.GameObjects.GameObject[] = [];
  private shopSelectedIndex: number = 0;
  private shopItemTexts: { name: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text }[] = [];
  private shopBalanceText: Phaser.GameObjects.Text | null = null;
  private shopSelectionData: {
    consumables: PowerUpDefinition[];
    nextLevel: number;
    angles: number[];
    purchased: Set<number>;
  } = { consumables: [], nextLevel: 0, angles: [], purchased: new Set() };

  // Equip screen state
  private equipUIElements: Phaser.GameObjects.GameObject[] = [];
  private nextLevelForEquipScreen: number = 0;

  // Streak HUD
  private streakLabel!: Phaser.GameObjects.Text;
  private streakValue!: Phaser.GameObjects.Text;

  // Power-up stack HUD (bottom-left)
  private powerUpHudElements: Phaser.GameObjects.Text[] = [];
  private levelLabel!: Phaser.GameObjects.Text;
  private levelValue!: Phaser.GameObjects.Text;
  private matterLabel!: Phaser.GameObjects.Text;
  private matterValue!: Phaser.GameObjects.Text;
  private scoreLabel!: Phaser.GameObjects.Text;
  private scoreValue2!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private benchmarkText!: Phaser.GameObjects.Text;
  private benchmarkDone: boolean = false;

  private difficulty: Difficulty = DEFAULT_DIFFICULTY;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.centerX = GAME_WIDTH / 2;
    this.centerY = GAME_HEIGHT / 2;
    this.terminalRadius = TERMINAL_RADIUS_INITIAL;
    this.visionRadius = VISION_RADIUS_INITIAL;

    // Reset arrays to avoid stale references from previous scene runs
    this.enemies = [];
    this.bullets = [];
    this.shields = [];
    this.sweepShots = [];
    this.orbitalFlares = [];
    this.orbitalBullets = [];
    this.powerUpUIElements = [];
    this.powerUpItemTexts = [];
    this.powerUpHudElements = [];
    this.slotHudElements = [];
    this.shopUIElements = [];
    this.shopItemTexts = [];
    this.equipUIElements = [];
    this.laserSparks = [];
    this.dustParticles = [];
    this.pauseUIElements = [];
    this.isPaused = false;
    this.isPowerUpSelectionActive = false;
    this.playfieldTremble = 0;
    this.playfieldVisualRadius = PLAYFIELD_RADIUS;
    this.savedTerminalRadius = 0;
    this.laserBeamTimer = 0;
    this.laserScaleUpDone = false;
    this.dustSpawnTimer = 0;
    this.dustSpawnBatch = 0;
    this.benchmarkDone = false;

    // Read difficulty from localStorage
    const stored = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    this.difficulty = (stored as Difficulty) || DEFAULT_DIFFICULTY;

    // Initialize managers
    this.scoreManager = new ScoreManager(this.difficulty);
    this.levelManager = new LevelManager(this.difficulty);
    this.audioManager = new AudioManager(this);
    this.powerUpManager = new PowerUpManager();
    this.gamepadManager = new GamepadManager();
    this.spawnDistribution = new SpawnDistribution();

    // Set up blur effect
    this.setupBlurEffect();

    // Draw playfield
    this.playfieldGraphics = this.add.graphics();
    this.dustGraphics = this.add.graphics();
    this.drawPlayfield();

    // Laser beam graphics layer
    this.laserGraphics = this.add.graphics();

    // Create player
    this.player = new Player(this, this.centerX, this.centerY, BENCHMARK_MODE);
    this.player.setGamepadManager(this.gamepadManager);

    // Aiming dot (drawn on terminal radius while firing)
    this.aimingDotGraphics = this.add.graphics();
    this.aimingDotGraphics.setAlpha(0);
    this.aimingDotVisible = false;

    // Set up consumable keybindings
    this.setupConsumableKeys();

    // Create consumable HUD
    this.createConsumableHud();

    // Create streak HUD
    this.createStreakHud();

    // Animate UI elements in with overshoot
    this.animateHudEntrance();

    // Pause button (top-right)
    this.pauseButton = this.add.text(GAME_WIDTH - 60 * PX, 40 * PX, '||', {
      fontSize: `${40 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    this.pauseButton.setOrigin(0.5);
    this.pauseButton.setAlpha(0.5);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerover', () => {
      if (!this.isPaused) this.pauseButton.setAlpha(1);
    });
    this.pauseButton.on('pointerout', () => {
      if (!this.isPaused) this.pauseButton.setAlpha(0.5);
    });
    this.pauseButton.on('pointerdown', () => {
      this.togglePause();
    });
    this.pauseButton.setDepth(10);

    // Escape key for pause
    if (this.input.keyboard) {
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    // FPS counter (top-left corner)
    this.fpsText = this.add.text(16 * PX, 16 * PX, '', {
      fontSize: `${24 * PX}px`,
      color: '#00ff00',
      fontFamily: "'Rajdhani', sans-serif",
    });
    this.fpsText.setDepth(1000);

    // Benchmark HUD label
    this.benchmarkText = this.add.text(16 * PX, 48 * PX, '', {
      fontSize: `${24 * PX}px`,
      color: '#ffaa00',
      fontFamily: "'Rajdhani', sans-serif",
    });
    this.benchmarkText.setDepth(1000);
    if (BENCHMARK_MODE) {
      this.benchmarkText.setText(`BENCHMARK seed=${BENCHMARK_SEED}`);
    }

    // Apply power-ups from ?powerups= query param
    for (const { type, count } of parsePowerUpsParam()) {
      const powerUpType = PowerUpType[type as keyof typeof PowerUpType];
      if (powerUpType) {
        for (let i = 0; i < count; i++) {
          this.powerUpManager.addPowerUp(powerUpType);
        }
      }
    }
    this.updatePowerUpHud();

    // Debug: ?scene=powerup lands directly in the power-up menu
    const data = this.scene.settings.data as Record<string, unknown>;
    if (data?.debugPowerUp) {
      this.terminalRadius = PLAYFIELD_RADIUS * 0.3;
      this.levelManager.startLevel(1);
      this.levelManager.completeLevel();
      this.showPowerUpSelection(1);
      return;
    }

    // Start first level
    this.levelManager.startLevel(START_LEVEL);
  }

  private setupConsumableKeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-ONE', () => this.activateSlot(0));
    keyboard.on('keydown-TWO', () => this.activateSlot(1));
    keyboard.on('keydown-THREE', () => this.activateSlot(2));
    keyboard.on('keydown-FOUR', () => this.activateSlot(3));
  }

  // ─── Radial Positioning Helper ───────────────────────────────────────

  /**
   * Compute position, rotation and origin for text placed radially outside
   * the playfield. Angles are in degrees (Phaser convention: 0° = right,
   * 90° = down, 180° = left, 270° = up). Text on the left half (90°-270°)
   * is automatically flipped so it reads correctly.
   */
  private radialTextLayout(
    angleDeg: number,
    radius: number
  ): { x: number; y: number; rotation: number; originX: number } {
    const angle = (angleDeg * Math.PI) / 180;
    const x = this.centerX + Math.cos(angle) * radius;
    const y = this.centerY + Math.sin(angle) * radius;
    const needsFlip = angleDeg > 90 || angleDeg < -90;
    return {
      x,
      y,
      rotation: needsFlip ? angle + Math.PI : angle,
      originX: needsFlip ? 1 : 0,
    };
  }

  // ─── Consumable HUD ──────────────────────────────────────────────────

  private createConsumableHud() {
    const hudY = this.centerY + PLAYFIELD_RADIUS + 50 * PX;

    for (let i = 0; i < MAX_EQUIPPED_SLOTS; i++) {
      const hudX = this.centerX + (i - 1.5) * 200 * PX;
      const color = '#' + COLORS.playfield.toString(16).padStart(6, '0');
      const text = this.add.text(hudX, hudY, '', {
        fontSize: `${36 * PX}px`,
        color,
        fontFamily: "'Rajdhani', sans-serif",
        align: 'center',
      });
      text.setOrigin(0.5);
      this.slotHudElements.push(text);
    }
  }

  private updateConsumableHud() {
    for (let i = 0; i < this.slotHudElements.length; i++) {
      const text = this.slotHudElements[i];
      const type = this.powerUpManager.getEquippedSlot(i);

      if (type) {
        const def = getConsumableDefinition(type);
        const name = def ? def.name : type;
        text.setText(`[${i + 1}] ${name}`);
        text.setColor('#' + COLORS.playfield.toString(16).padStart(6, '0'));
      } else {
        text.setText(`[${i + 1}] ---`);
        text.setColor('#' + COLORS.playfield.toString(16).padStart(6, '0'));
      }
    }
  }

  private createRadialHud(
    angleDeg: number,
    label: string
  ): { label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text } {
    const hudDist = PLAYFIELD_RADIUS + 15 * PX;
    const layout = this.radialTextLayout(angleDeg, hudDist);
    const color = '#' + COLORS.playfield.toString(16).padStart(6, '0');

    const labelText = this.add.text(layout.x, layout.y, label, {
      fontSize: `${HUD_FONT_SECONDARY}px`,
      color,
      fontFamily: "'Rajdhani', sans-serif",
    });
    labelText.setOrigin(layout.originX, 0);
    labelText.setRotation(layout.rotation);

    const angle = (angleDeg * Math.PI) / 180;
    const lineOffset = 40 * PX;
    const valueX = layout.x + Math.sin(-angle) * lineOffset;
    const valueY = layout.y + Math.cos(-angle) * lineOffset;
    const valueText = this.add.text(valueX, valueY, '0', {
      fontSize: `${HUD_FONT_PRIMARY}px`,
      color,
      fontFamily: "'Rajdhani', sans-serif",
    });
    valueText.setOrigin(layout.originX, 0);
    valueText.setRotation(layout.rotation);

    return { label: labelText, value: valueText };
  }

  private createStreakHud() {
    const streak = this.createRadialHud(-12, 'STREAK');
    this.streakLabel = streak.label;
    this.streakValue = streak.value;

    const score = this.createRadialHud(-20, 'SCORE');
    this.scoreLabel = score.label;
    this.scoreValue2 = score.value;

    const level = this.createRadialHud(-28, 'LEVEL');
    this.levelLabel = level.label;
    this.levelValue = level.value;

    const matter = this.createRadialHud(-36, 'MATTER');
    this.matterLabel = matter.label;
    this.matterValue = matter.value;
  }

  private animateHudEntrance() {
    const hudElements: Phaser.GameObjects.Text[] = [
      this.streakLabel,
      this.streakValue,
      this.scoreLabel,
      this.scoreValue2,
      this.levelLabel,
      this.levelValue,
      this.matterLabel,
      this.matterValue,
      ...this.slotHudElements,
    ];

    hudElements.forEach((el, i) => {
      el.setScale(0);
      this.tweens.add({
        targets: el,
        scale: 1,
        duration: 400,
        delay: i * 30,
        ease: 'Back.easeOut',
      });
    });
  }

  private updateStreakHud() {
    this.streakValue.setText(`${this.scoreManager.getHitStreak()}`);
    this.levelValue.setText(`${this.levelManager.getCurrentLevel()}`);
    this.scoreValue2.setText(`${this.scoreManager.getScore()}`);
    this.matterValue.setText(`${this.scoreManager.getMatter()}`);
  }

  // ─── Power-Up Stack HUD (bottom-left) ─────────────────────────────────

  private updatePowerUpHud() {
    // Destroy old elements
    for (const el of this.powerUpHudElements) {
      el.destroy();
    }
    this.powerUpHudElements = [];

    const passives = this.powerUpManager.getActivePassives();
    if (passives.length === 0) return;

    const headerDeg = 175;
    const headerGap = 5; // gap between header and first item
    const itemStep = 3; // gap between items
    const color = '#' + COLORS.playfield.toString(16).padStart(6, '0');
    const hudDist = this.playfieldVisualRadius + 15 * PX;

    // "UPGRADES" header fixed at 170°
    const headerLayout = this.radialTextLayout(headerDeg, hudDist);
    const label = this.add.text(headerLayout.x, headerLayout.y, 'UPGRADES', {
      fontSize: `${52 * PX}px`,
      color,
      fontFamily: "'Rajdhani', sans-serif",
      fontStyle: '400',
    });
    label.setOrigin(headerLayout.originX, 0);
    label.setRotation(headerLayout.rotation);
    this.powerUpHudElements.push(label);

    // Items grow downward (decreasing angle = lower on screen)
    passives.forEach((p, i) => {
      const angleDeg = headerDeg - headerGap - i * itemStep;
      const layout = this.radialTextLayout(angleDeg, hudDist);

      const text = this.add.text(layout.x, layout.y, `${p.name} [x${p.stacks}]`, {
        fontSize: `${28 * PX}px`,
        color,
        fontFamily: "'Rajdhani', sans-serif",
      });
      text.setOrigin(layout.originX, 0);
      text.setRotation(layout.rotation);
      this.powerUpHudElements.push(text);
    });
  }

  private repositionPowerUpHud(radius: number) {
    const headerDeg = 175;
    const headerGap = 5;
    const itemStep = 3;
    const hudDist = radius + 15 * PX;

    this.powerUpHudElements.forEach((text, i) => {
      // i=0 is header at headerDeg, i=1+ are items growing downward
      const angleDeg = i === 0 ? headerDeg : headerDeg - headerGap - (i - 1) * itemStep;
      const layout = this.radialTextLayout(angleDeg, hudDist);
      text.setPosition(layout.x, layout.y);
    });
  }

  // ─── Consumable Activation ────────────────────────────────────────────

  private activateSlot(slot: number) {
    if (this.isPowerUpSelectionActive) return;
    if (this.laserBeamTimer > 0) return;

    const type = this.powerUpManager.useEquippedSlot(slot);
    if (!type) return;

    switch (type) {
      case PowerUpType.SHOCKWAVE:
        this.activateShockwave();
        break;
      case PowerUpType.NOVA_BURST:
        this.activateNovaBurst();
        break;
      case PowerUpType.LASER_BEAM:
        this.activateLaserBeam();
        break;
      case PowerUpType.SWEEPSHOT:
        this.activateSweepShot();
        break;
      case PowerUpType.ORBITAL_FLARE:
        this.activateOrbitalFlare();
        break;
    }
  }

  private activateShockwave() {
    // Visual effect
    ParticleEffects.createShockwaveEffect(this, this.centerX, this.centerY);
    this.cameras.main.shake(200, 0.008);
    this.gamepadManager.vibrate(200, 0.3, 0.8);
    this.audioManager.playSound('terminalGrow');

    // Kill all enemies
    for (const enemy of this.enemies) {
      if (enemy.active) {
        const bounds = enemy.getBounds();
        ParticleEffects.createEnemyDeathParticles(this, bounds.x, bounds.y);
        this.scoreManager.addMatter(enemy.getHealth());
        this.scoreManager.addKill(enemy.tier);
        enemy.destroy();
      }
    }
    this.enemies = [];
  }

  private activateNovaBurst() {
    const pierceChance = this.powerUpManager.getPierceChance();

    // Fire 120 bullets, 3 degrees apart
    for (let deg = 0; deg < 360; deg += 3) {
      const angle = (deg * Math.PI) / 180;
      const dist = 100;
      const tx = this.player.x + Math.cos(angle) * dist;
      const ty = this.player.y + Math.sin(angle) * dist;
      const bullet = new Bullet(
        this,
        this.player.x,
        this.player.y,
        tx,
        ty,
        this.centerX,
        this.centerY,
        1,
        pierceChance
      );
      this.bullets.push(bullet);
    }

    this.cameras.main.shake(100, 0.008);
    this.gamepadManager.vibrate(100, 0.3, 0.8);
    this.audioManager.playSound('shoot');
  }

  private laserScaleUpDone: boolean = false;

  private activateLaserBeam() {
    this.laserBeamTimer = LASER_BEAM_DURATION;
    this.laserScaleUpDone = false;
    this.audioManager.playSound('laser');

    // Tween player scale up
    const scaleTarget = { value: 1.0 };
    this.tweens.add({
      targets: scaleTarget,
      value: 2.0,
      duration: 150,
      ease: 'Quad.easeOut',
      onUpdate: () => this.player.setScale(scaleTarget.value),
      onComplete: () => {
        this.laserScaleUpDone = true;
      },
    });
  }

  private activateSweepShot() {
    const aimAngle = this.player.getRotation();
    const sweep = new SweepShot(this, this.centerX, this.centerY, aimAngle);
    this.sweepShots.push(sweep);

    this.cameras.main.shake(100, 0.006);
    this.gamepadManager.vibrate(100, 0.2, 0.6);
    this.audioManager.playSound('shoot');
  }

  private activateOrbitalFlare() {
    const aimAngle = this.player.getRotation();
    const pierceChance = this.powerUpManager.getPierceChance();
    const flare = new OrbitalFlare(
      this,
      this.centerX,
      this.centerY,
      aimAngle,
      pierceChance,
      this.terminalRadius
    );
    this.orbitalFlares.push(flare);

    this.cameras.main.shake(100, 0.006);
    this.gamepadManager.vibrate(100, 0.2, 0.6);
    this.audioManager.playSound('shoot');
  }

  private updateSweepShots(delta: number) {
    for (let i = this.sweepShots.length - 1; i >= 0; i--) {
      const sweep = this.sweepShots[i];
      sweep.update(delta);
      if (!sweep.active) {
        this.sweepShots.splice(i, 1);
      }
    }
  }

  private checkSweepShotCollisions() {
    for (const sweep of this.sweepShots) {
      if (!sweep.active) continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (!enemy.active) continue;

        const enemyBounds = enemy.getBounds();

        if (sweep.checkCollision(enemyBounds.x, enemyBounds.y, enemyBounds.radius)) {
          ParticleEffects.createEnemyDeathParticles(this, enemyBounds.x, enemyBounds.y);
          this.scoreManager.addMatter(enemy.getHealth());
          this.scoreManager.addKill(enemy.tier);
          this.audioManager.playSound('hit');
          enemy.destroy();
          this.enemies.splice(j, 1);
        }
      }
    }
  }

  private updateOrbitalFlares(delta: number) {
    for (let i = this.orbitalFlares.length - 1; i >= 0; i--) {
      const flare = this.orbitalFlares[i];
      const spawned = flare.update(delta);
      if (spawned.length > 0) {
        this.audioManager.playSound('orbitalPip');
      }
      for (const bullet of spawned) {
        this.orbitalBullets.push(bullet);
      }
      if (!flare.active) {
        this.orbitalFlares.splice(i, 1);
      }
    }
  }

  private updateOrbitalBullets(delta: number) {
    for (let i = this.orbitalBullets.length - 1; i >= 0; i--) {
      const bullet = this.orbitalBullets[i];
      bullet.update(delta);
      if (!bullet.active) {
        this.orbitalBullets.splice(i, 1);
      }
    }
  }

  private checkOrbitalBulletCollisions() {
    for (let i = this.orbitalBullets.length - 1; i >= 0; i--) {
      const bullet = this.orbitalBullets[i];
      if (!bullet.active) continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (!enemy.active) continue;

        const bulletBounds = bullet.getBounds();
        const enemyBounds = enemy.getBounds();
        const dist = distPointToSegment(
          enemyBounds.x,
          enemyBounds.y,
          bullet.prevX,
          bullet.prevY,
          bulletBounds.x,
          bulletBounds.y
        );

        if (dist < bulletBounds.radius + enemyBounds.radius) {
          const hitX = enemyBounds.x;
          const hitY = enemyBounds.y;

          const bulletSurvives = bullet.onHitEnemy();
          if (!bulletSurvives) {
            bullet.destroy();
            this.orbitalBullets.splice(i, 1);
          }

          this.scoreManager.addMatter(1);
          const killed = enemy.hit();
          if (killed) {
            this.enemies.splice(j, 1);
            this.scoreManager.addKill(enemy.tier);
            ParticleEffects.createEnemyDeathParticles(this, hitX, hitY);
          } else {
            ParticleEffects.createEnemyHitParticles(
              this,
              hitX,
              hitY,
              bulletBounds.x,
              bulletBounds.y
            );
          }

          this.audioManager.playSound('hit');
          ParticleEffects.createBulletHitParticles(this, hitX, hitY);

          if (!bulletSurvives) break;
        }
      }
    }
  }

  private updateLaserBeam(delta: number) {
    // Always update and draw sparks
    this.updateLaserSparks(delta);

    if (this.laserBeamTimer <= 0) {
      this.laserGraphics.clear();
      this.drawLaserSparks();
      return;
    }

    this.laserBeamTimer -= delta;

    if (this.laserBeamTimer <= 0) {
      // Beam just ended — tween back to normal
      this.laserGraphics.clear();
      const downTarget = { value: this.player.getScale() };
      this.tweens.add({
        targets: downTarget,
        value: 1.0,
        duration: 200,
        ease: 'Quad.easeOut',
        onUpdate: () => this.player.setScale(downTarget.value),
      });
      return;
    }

    // Subtle screen tremble while beam is active
    this.cameras.main.shake(delta, 0.004);
    this.gamepadManager.vibrate(delta, 0.1, 0.3);

    // Chaotic player pulsation while beam is active (after tween-in)
    if (this.laserScaleUpDone) {
      this.player.setScale(1.8 + Math.random() * 0.4);
    }

    const aimAngle = this.player.getRotation();

    // Draw laser beam as a filled arc/wedge
    this.laserGraphics.clear();

    const beamAlpha = Math.min(1, this.laserBeamTimer / 300); // Fade out in last 300ms
    const flicker = 0.85 + Math.random() * 0.15;

    // Outer glow
    this.laserGraphics.fillStyle(0xcccccc, 0.15 * beamAlpha * flicker);
    this.laserGraphics.slice(
      this.centerX,
      this.centerY,
      PLAYFIELD_RADIUS,
      aimAngle - LASER_BEAM_HALF_ANGLE * 2,
      aimAngle + LASER_BEAM_HALF_ANGLE * 2,
      false
    );
    this.laserGraphics.fillPath();

    // Core beam — full hitbox width, bright white
    this.laserGraphics.fillStyle(0xffffff, 0.8 * beamAlpha * flicker);
    this.laserGraphics.slice(
      this.centerX,
      this.centerY,
      PLAYFIELD_RADIUS,
      aimAngle - LASER_BEAM_HALF_ANGLE,
      aimAngle + LASER_BEAM_HALF_ANGLE,
      false
    );
    this.laserGraphics.fillPath();

    // Draw sparks on top of beam
    this.drawLaserSparks();

    // Spawn sparks across the beam arc on the playfield edge
    for (let s = 0; s < 5; s++) {
      const spawnAngle = aimAngle + (Math.random() - 0.5) * LASER_BEAM_HALF_ANGLE * 2;
      const spawnX = this.centerX + Math.cos(spawnAngle) * PLAYFIELD_RADIUS;
      const spawnY = this.centerY + Math.sin(spawnAngle) * PLAYFIELD_RADIUS;
      // Sideways: tangent to the edge with some inward component
      const tangent = spawnAngle + (Math.PI / 2) * (Math.random() < 0.5 ? 1 : -1);
      const inward = spawnAngle + Math.PI;
      const mix = 0.2 + Math.random() * 0.3; // 20-50% inward, rest tangential
      const bounceAngle = Math.atan2(
        Math.sin(tangent) * (1 - mix) + Math.sin(inward) * mix,
        Math.cos(tangent) * (1 - mix) + Math.cos(inward) * mix
      );
      const speed = (200 + Math.random() * 300) * PX;
      this.laserSparks.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(bounceAngle) * speed,
        vy: Math.sin(bounceAngle) * speed,
        life: 0.6 + Math.random() * 0.6,
      });
    }

    // Hit enemies within the beam arc
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) continue;

      const enemyAngle = Math.atan2(enemy.y - this.centerY, enemy.x - this.centerX);
      let angleDiff = enemyAngle - aimAngle;

      // Normalize to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < LASER_BEAM_HALF_ANGLE) {
        const bounds = enemy.getBounds();
        ParticleEffects.createEnemyDeathParticles(this, bounds.x, bounds.y);
        ParticleEffects.createBulletHitParticles(this, bounds.x, bounds.y);
        this.scoreManager.addMatter(enemy.getHealth());
        this.scoreManager.addKill(enemy.tier);
        this.audioManager.playSound('hit');
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateLaserSparks(delta: number) {
    const deltaSec = delta / 1000;

    for (let i = this.laserSparks.length - 1; i >= 0; i--) {
      const s = this.laserSparks[i];
      s.x += s.vx * deltaSec;
      s.y += s.vy * deltaSec;
      s.life -= deltaSec;

      // Clamp inside playfield — bounce off edge
      const dx = s.x - this.centerX;
      const dy = s.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > PLAYFIELD_RADIUS) {
        const nx = dx / dist;
        const ny = dy / dist;
        s.x = this.centerX + nx * PLAYFIELD_RADIUS;
        s.y = this.centerY + ny * PLAYFIELD_RADIUS;
        const dot = s.vx * nx + s.vy * ny;
        s.vx -= 2 * dot * nx;
        s.vy -= 2 * dot * ny;
      }

      if (s.life <= 0) {
        this.laserSparks.splice(i, 1);
      }
    }
  }

  private drawLaserSparks() {
    for (const s of this.laserSparks) {
      const alpha = s.life / 1.2;
      const angle = Math.atan2(s.vy, s.vx);
      this.laserGraphics.fillStyle(0xffffff, alpha);
      this.laserGraphics.save();
      this.laserGraphics.translateCanvas(s.x, s.y);
      this.laserGraphics.rotateCanvas(angle);
      this.laserGraphics.fillEllipse(0, 0, 14 * PX, 4 * PX);
      this.laserGraphics.restore();
    }
  }

  // ─── Core Game Logic ──────────────────────────────────────────────────

  private updateDustParticles(delta: number, slowZoneRadius: number, gravityStacks: number) {
    const deltaSec = delta / 1000;

    // Only spawn when gravity well is active
    if (gravityStacks > 0) {
      const spawnInterval = 0.5;
      this.dustSpawnTimer += deltaSec;
      while (this.dustSpawnTimer >= spawnInterval) {
        this.dustSpawnTimer -= spawnInterval;
        const offset = this.dustSpawnBatch % 2;
        for (let i = 0; i < 12; i++) {
          const slot = i * 2 + offset;
          const theta = (slot / 24) * Math.PI * 2;
          this.dustParticles.push({ r: slowZoneRadius, theta });
        }
        this.dustSpawnBatch++;
      }
    }

    // Move and cull particles
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.r -= ENEMY_SPEED * PLAYFIELD_RADIUS * deltaSec * 0.7;
      if (p.r <= this.terminalRadius) {
        this.dustParticles.splice(i, 1);
      }
    }
  }

  private drawPlayfield() {
    this.playfieldGraphics.clear();

    const radius = this.playfieldVisualRadius;

    // Draw playfield circle (with tremble offset)
    const trembleOffset =
      this.playfieldTremble > 0 ? (Math.random() - 0.5) * this.playfieldTremble : 0;
    this.playfieldGraphics.fillStyle(COLORS.playfield, 1);
    this.playfieldGraphics.fillCircle(this.centerX, this.centerY, radius + trembleOffset);

    // Draw vision radius edge (subtle indicator)
    if (this.visionRadius < radius) {
      this.playfieldGraphics.lineStyle(4 * PX, 0xffffff, 0.2);
      this.playfieldGraphics.strokeCircle(this.centerX, this.centerY, this.visionRadius);
    }

    // Draw terminal radius hint (danger zone)
    if (this.terminalRadius > 0 && this.terminalRadius < radius) {
      this.playfieldGraphics.lineStyle(2 * PX, COLORS.terminalRadiusHint, 1);
      this.playfieldGraphics.strokeCircle(this.centerX, this.centerY, this.terminalRadius);
    }
  }

  private updateAimingDot() {
    const shouldShowDot =
      (this.player.isFiringActive() || this.player.isGamepadAiming()) && this.terminalRadius > 0;
    if (shouldShowDot !== this.aimingDotVisible) {
      this.aimingDotVisible = shouldShowDot;
      this.tweens.killTweensOf(this.aimingDotGraphics);
      this.tweens.add({
        targets: this.aimingDotGraphics,
        alpha: shouldShowDot ? 1 : 0,
        duration: shouldShowDot ? 80 : 200,
        ease: 'Quad.easeOut',
      });
    }
    if (this.aimingDotGraphics.alpha > 0) {
      this.aimingDotGraphics.clear();
      const aimAngle = this.player.getRotation();
      const dotX = this.centerX + Math.cos(aimAngle) * this.terminalRadius;
      const dotY = this.centerY + Math.sin(aimAngle) * this.terminalRadius;
      this.aimingDotGraphics.fillStyle(COLORS.terminalRadiusHint, 1);
      this.aimingDotGraphics.fillCircle(dotX, dotY, 6 * PX);
    } else if (!this.aimingDotVisible) {
      this.aimingDotGraphics.clear();
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
    // Lock delta in benchmark mode for frame-perfect determinism
    if (BENCHMARK_MODE) {
      delta = 16.667;
    }

    // FPS display
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);

    // Update blur effect every frame
    this.updateBlurEffect();

    // Check pause toggle (Escape key or gamepad Start)
    const escPressed = this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey);
    const startPressed = this.gamepadManager.isStartJustPressed();
    if ((escPressed || startPressed) && !this.isPowerUpSelectionActive) {
      this.togglePause();
    }

    // Skip game logic while paused
    if (this.isPaused) {
      this.updatePauseGamepadNavigation();
      this.gamepadManager.updatePrevState();
      return;
    }

    // Pause game while power-up selection, equip screen, or benchmark end is active
    if (this.isPowerUpSelectionActive || this.benchmarkDone) {
      this.updateAimingDot();
      this.updatePowerUpGamepadNavigation();
      this.updateShopGamepadNavigation();
      this.gamepadManager.updatePrevState();
      return;
    }

    // Gamepad consumable activation (A/B/X/Y map to slots 0-3)
    if (this.gamepadManager.isAJustPressed()) this.activateSlot(0);
    if (this.gamepadManager.isBJustPressed()) this.activateSlot(1);
    if (this.gamepadManager.isButtonJustPressed(2)) this.activateSlot(2);
    if (this.gamepadManager.isButtonJustPressed(3)) this.activateSlot(3);

    // Update laser beam (runs even if not active — clears graphics when timer is 0)
    this.updateLaserBeam(delta);

    // Update HUD
    this.updateConsumableHud();
    this.updateStreakHud();

    // Auto-aim: find nearest enemy for benchmark bot
    let aimTarget: { x: number; y: number } | undefined;
    if (BENCHMARK_MODE && this.enemies.length > 0) {
      let closestDistSq = Infinity;
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          aimTarget = { x: enemy.x, y: enemy.y };
        }
      }
    }

    // Update player — suppress normal shooting while laser is active
    const laserActive = this.laserBeamTimer > 0;
    const shootInfo = this.player.update(
      time,
      delta,
      this.powerUpManager.getFireCooldown(),
      aimTarget,
      laserActive ? LASER_MAX_ANGULAR_SPEED : undefined
    );
    if (shootInfo.shouldShoot && this.laserBeamTimer <= 0) {
      this.shoot(shootInfo.targetX, shootInfo.targetY);
    }

    this.updateAimingDot();

    // Update spawn distribution and level manager
    this.spawnDistribution.update(delta / 1000);
    if (this.levelManager.update(delta)) {
      this.spawnEnemy();
    }

    // Update enemies — Gravity Well slows enemies near terminal radius
    const gravityStacks = this.powerUpManager.getGravityWellStacks();
    const slowZoneRadius =
      gravityStacks > 0 ? this.terminalRadius + 0.25 * (PLAYFIELD_RADIUS - this.terminalRadius) : 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) {
        this.enemies.splice(i, 1);
        continue;
      }

      const speedMult = gravityStacks > 0 && enemy.getRadius() <= slowZoneRadius ? 0.7 : 1;
      enemy.update(delta, speedMult);

      // Check if enemy edge touched terminal radius
      if (enemy.getRadius() - enemy.getSize() < this.terminalRadius) {
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

    // Update and draw background dust particles
    this.updateDustParticles(delta, slowZoneRadius, gravityStacks);
    this.drawPlayfield();
    this.dustGraphics.clear();
    for (const p of this.dustParticles) {
      const px = this.centerX + Math.cos(p.theta) * p.r;
      const py = this.centerY + Math.sin(p.theta) * p.r;
      this.dustGraphics.fillStyle(0x939393, 1);
      this.dustGraphics.fillCircle(px, py, 2 * PX);
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.active) {
        // Manual bullet exited playfield without hitting — reset streak
        if (bullet.isManual && !bullet.hasHitEnemy) {
          this.scoreManager.resetHitStreak();
        }
        this.bullets.splice(i, 1);
        continue;
      }

      bullet.update(delta);
    }

    // Update orbital shields
    this.updateShields(delta);

    // Update sweep shots
    this.updateSweepShots(delta);

    // Update orbital flares & bullets
    this.updateOrbitalFlares(delta);
    this.updateOrbitalBullets(delta);

    // Check collisions
    this.checkCollisions();

    // Check shield-enemy collisions
    this.checkShieldCollisions();

    // Check sweep shot-enemy collisions
    this.checkSweepShotCollisions();

    // Check orbital bullet-enemy collisions
    this.checkOrbitalBulletCollisions();

    // Check level completion
    if (this.levelManager.isLevelComplete(this.enemies.length)) {
      const completedLevel = this.levelManager.getCurrentLevel();
      this.levelManager.completeLevel();

      // Clean up bullets
      for (const bullet of this.bullets) bullet.destroy();
      this.bullets = [];
      for (const flare of this.orbitalFlares) flare.destroy();
      this.orbitalFlares = [];
      for (const bullet of this.orbitalBullets) bullet.destroy();
      this.orbitalBullets = [];

      // Stop laser beam if active
      if (this.laserBeamTimer > 0) {
        this.laserBeamTimer = 0;
        this.laserGraphics.clear();
        this.player.setScale(1.0);
        this.audioManager.stopSound('laser');
      }

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
      this.playfieldTremble = 20 * PX;
      this.tweens.add({
        targets: this,
        playfieldTremble: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          this.drawPlayfield();
        },
      });

      // In benchmark mode, freeze at end of level and log results
      if (BENCHMARK_MODE) {
        this.benchmarkDone = true;
        console.log(
          `[BENCHMARK] level=${completedLevel} seed=${BENCHMARK_SEED} score=${this.scoreManager.getScore()}`
        );
        this.benchmarkText.setText(
          `BENCHMARK DONE  seed=${BENCHMARK_SEED}  level=${completedLevel}  score=${this.scoreManager.getScore()}`
        );
      } else {
        // Show power-up selection after a short delay
        this.time.delayedCall(500, () => {
          this.showPowerUpSelection(completedLevel);
        });
      }
    }

    // Check game over
    if (this.terminalRadius >= PLAYFIELD_RADIUS) {
      this.gameOver();
    }

    this.gamepadManager.updatePrevState();
  }

  private shoot(targetX: number, targetY: number) {
    const bulletCount = this.powerUpManager.getBulletCount();
    const baseAngle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    const spreadAngle = (2 * Math.PI) / 180; // 2 degrees in radians
    const pierceChance = this.powerUpManager.getPierceChance();

    if (bulletCount === 1) {
      const bullet = new Bullet(
        this,
        this.player.x,
        this.player.y,
        targetX,
        targetY,
        this.centerX,
        this.centerY,
        1,
        pierceChance
      );
      bullet.isManual = true;
      this.bullets.push(bullet);
    } else {
      // Center the spread around the aim direction
      const startOffset = -((bulletCount - 1) / 2) * spreadAngle;
      for (let i = 0; i < bulletCount; i++) {
        const angle = baseAngle + startOffset + i * spreadAngle;
        const dist = 100; // arbitrary distance to create target point
        const tx = this.player.x + Math.cos(angle) * dist;
        const ty = this.player.y + Math.sin(angle) * dist;
        const bullet = new Bullet(
          this,
          this.player.x,
          this.player.y,
          tx,
          ty,
          this.centerX,
          this.centerY,
          1,
          pierceChance
        );
        bullet.isManual = true;
        this.bullets.push(bullet);
      }
    }

    // Tail gun: fire bullets in the opposite direction
    const tailGunCount = this.powerUpManager.getTailGunBulletCount();
    if (tailGunCount > 0) {
      const reverseAngle = baseAngle + Math.PI;
      if (tailGunCount === 1) {
        const dist = 100;
        const tx = this.player.x + Math.cos(reverseAngle) * dist;
        const ty = this.player.y + Math.sin(reverseAngle) * dist;
        const bullet = new Bullet(
          this,
          this.player.x,
          this.player.y,
          tx,
          ty,
          this.centerX,
          this.centerY,
          1,
          pierceChance
        );
        this.bullets.push(bullet);
      } else {
        const startOffset = -((tailGunCount - 1) / 2) * spreadAngle;
        for (let i = 0; i < tailGunCount; i++) {
          const angle = reverseAngle + startOffset + i * spreadAngle;
          const dist = 100;
          const tx = this.player.x + Math.cos(angle) * dist;
          const ty = this.player.y + Math.sin(angle) * dist;
          const bullet = new Bullet(
            this,
            this.player.x,
            this.player.y,
            tx,
            ty,
            this.centerX,
            this.centerY,
            1,
            pierceChance
          );
          this.bullets.push(bullet);
        }
      }
    }

    this.audioManager.playSound('shoot');
  }

  private spawnEnemy() {
    const angle = this.spawnDistribution.sample();
    const health = this.rollEnemyHealth();
    const enemy = new Enemy(this, angle, this.centerX, this.centerY, health);
    this.enemies.push(enemy);
  }

  private rollEnemyHealth(): number {
    const playerLevel = this.levelManager.getCurrentLevel();
    const weights: { level: number; weight: number }[] = [];
    const gap = ENEMY_LEVEL_GAP[this.difficulty];
    const exp = ENEMY_LEVEL_EXP[this.difficulty];

    for (let L = 1; ; L++) {
      const threshold = L === 1 ? 0 : gap * (L - 1) - 1;
      if (playerLevel < threshold) break;
      const raw = playerLevel - threshold + 1;
      weights.push({ level: L, weight: Math.pow(raw, exp) });
    }

    const total = weights.reduce((s, w) => s + w.weight, 0);
    const roll = gameRandom() * total;
    let cumulative = 0;
    for (const w of weights) {
      cumulative += w.weight;
      if (roll < cumulative) return w.level;
    }
    return 1;
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
        const dist = distPointToSegment(
          enemyBounds.x,
          enemyBounds.y,
          bullet.prevX,
          bullet.prevY,
          bulletBounds.x,
          bulletBounds.y
        );

        if (dist < bulletBounds.radius + enemyBounds.radius) {
          // Hit!
          const hitX = enemyBounds.x;
          const hitY = enemyBounds.y;
          const bx = bulletBounds.x;
          const by = bulletBounds.y;

          // Increment streak on first hit, after scoring so bonus uses pre-hit value
          const isFirstHit = bullet.isManual && !bullet.hasHitEnemy;
          bullet.hasHitEnemy = true;

          // Check piercing: bullet survives if it has pierce remaining
          const bulletSurvives = bullet.onHitEnemy();

          if (!bulletSurvives) {
            bullet.destroy();
            this.bullets.splice(i, 1);
          }

          this.scoreManager.addMatter(1);
          const killed = enemy.hit();
          if (killed) {
            this.enemies.splice(j, 1);
            this.scoreManager.addKill(enemy.tier);
            this.applyVisionRecovery();
            ParticleEffects.createEnemyDeathParticles(this, hitX, hitY);
          } else {
            const pushbackDist = this.powerUpManager.getPushbackDistance();
            if (pushbackDist > 0) {
              enemy.pushBack(pushbackDist);
            }
            ParticleEffects.createEnemyHitParticles(this, hitX, hitY, bx, by);
          }

          this.audioManager.playSound('hit');
          ParticleEffects.createBulletHitParticles(this, hitX, hitY);

          // Chain lightning
          this.processChainLightning(hitX, hitY, enemy);

          if (isFirstHit) {
            this.scoreManager.incrementHitStreak();
          }

          if (!bulletSurvives) break;
        }
      }
    }
  }

  private processChainLightning(originX: number, originY: number, sourceEnemy?: Enemy) {
    const chainCount = this.powerUpManager.getChainCount();
    if (chainCount <= 0) return;

    const chainRange = this.powerUpManager.getChainRange();
    let chainsRemaining = chainCount;
    let currentX = originX;
    let currentY = originY;
    const hitSet = new Set<Enemy>();
    if (sourceEnemy) hitSet.add(sourceEnemy);
    let playedSound = false;

    while (chainsRemaining > 0) {
      // Find closest enemy within range that hasn't been hit yet
      let closestEnemy: Enemy | null = null;
      let closestDist = Infinity;

      for (const enemy of this.enemies) {
        if (!enemy.active || hitSet.has(enemy)) continue;
        const dist = distance(currentX, currentY, enemy.x, enemy.y);
        if (dist < chainRange && dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (!closestEnemy) break;

      if (!playedSound) {
        this.audioManager.playSound('lightning');
        playedSound = true;
      }

      hitSet.add(closestEnemy);
      const targetBounds = closestEnemy.getBounds();

      // Lightning visual
      ParticleEffects.createChainLightningEffect(
        this,
        currentX,
        currentY,
        targetBounds.x,
        targetBounds.y
      );

      // Kill the chained enemy
      ParticleEffects.createEnemyDeathParticles(this, targetBounds.x, targetBounds.y);
      currentX = targetBounds.x;
      currentY = targetBounds.y;
      this.scoreManager.addMatter(closestEnemy.getHealth());
      closestEnemy.destroy();
      this.scoreManager.addKill(closestEnemy.tier);

      chainsRemaining--;
    }
  }

  private getSlotAngle(slot: number): number {
    return (slot * Math.PI * 2) / SHIELD_MAX_SLOTS;
  }

  private spawnShieldAtRandomSlot() {
    const occupied = new Set(this.shields.filter((s) => s.active).map((s) => s.slot));
    const free: number[] = [];
    for (let i = 0; i < SHIELD_MAX_SLOTS; i++) {
      if (!occupied.has(i)) free.push(i);
    }
    if (free.length === 0) return;
    const slot = free[Math.floor(gameRandom() * free.length)];
    const shield = new OrbitalShield(
      this,
      this.centerX,
      this.centerY,
      slot,
      this.getSlotAngle(slot)
    );
    this.shields.push(shield);
  }

  private updateShields(delta: number) {
    const targetCount = this.powerUpManager.getShieldCount();

    // Spawn new shields at random free slots
    while (this.shields.filter((s) => s.active).length < targetCount) {
      this.spawnShieldAtRandomSlot();
    }

    // Rotate all shields together
    this.shieldRotation += SHIELD_ORBIT_SPEED * (delta / 1000);

    // Update existing shields
    for (const shield of this.shields) {
      shield.update(this.terminalRadius, this.shieldRotation);
    }
  }

  private checkShieldCollisions() {
    for (const shield of this.shields) {
      if (!shield.active) continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (!enemy.active) continue;

        const enemyBounds = enemy.getBounds();

        if (shield.checkCollision(enemyBounds.x, enemyBounds.y, enemyBounds.radius)) {
          const hitX = enemyBounds.x;
          const hitY = enemyBounds.y;

          this.scoreManager.addMatter(enemy.getHealth());
          enemy.destroy();
          this.enemies.splice(j, 1);
          this.scoreManager.addKill(enemy.tier);
          this.audioManager.playSound('hit');

          const arc = shield.getArcInfo();
          ParticleEffects.createShieldHitParticles(
            this,
            arc.centerX,
            arc.centerY,
            arc.angle,
            arc.arcAngle,
            arc.radius
          );
          ParticleEffects.createEnemyDeathParticles(this, hitX, hitY);

          // Shield takes damage
          if (shield.onHit()) {
            this.powerUpManager.removeStack(PowerUpType.ORBITAL_SHIELD);
            this.audioManager.playSound('shieldDestroy');
            ParticleEffects.createShieldDestroyParticles(
              this,
              arc.centerX,
              arc.centerY,
              arc.angle,
              arc.arcAngle,
              arc.radius
            );
            break; // shield destroyed, stop checking enemies for it
          } else {
            this.audioManager.playSound('shieldHit');
          }
        }
      }
    }

    // Remove destroyed shields
    this.shields = this.shields.filter((s) => s.active);
  }

  private applyVisionRecovery() {
    const recovery = this.powerUpManager.getVisionRecovery();
    if (recovery > 0 && this.visionRadius < PLAYFIELD_RADIUS) {
      this.visionRadius = Math.min(PLAYFIELD_RADIUS, this.visionRadius + recovery);
      this.drawPlayfield();
    }
  }

  private onEnemyReachedPlayer(enemy: Enemy) {
    enemy.destroy();
    const newVisionRadius = this.visionRadius - this.powerUpManager.getVisionRadiusDecrease();
    this.audioManager.playSound('damage');

    // Screen shake on damage
    this.cameras.main.shake(100, 0.005);
    this.gamepadManager.vibrate(100, 0.2, 0.6);

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
          const newTerminalRadius = this.terminalRadius + TERMINAL_RADIUS_INCREASE[this.difficulty];

          this.audioManager.playSound('terminalGrow');

          // Strong screen shake for terminal grow
          this.cameras.main.shake(300, 0.01);
          this.gamepadManager.vibrate(300, 0.5, 1.0);

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

  // ─── Pause ──────────────────────────────────────────────────────────────

  private togglePause() {
    if (this.isPaused) {
      this.hidePauseUI();
    } else {
      this.showPauseUI();
    }
  }

  private pauseMenuIndex: number = 0;
  private pauseMenuButtons: Phaser.GameObjects.Text[] = [];
  private pauseMenuActions: (() => void)[] = [];

  private showPauseUI() {
    this.isPaused = true;
    this.pauseButton.setAlpha(0);
    this.pauseMenuIndex = 0;
    this.pauseMenuButtons = [];
    this.pauseMenuActions = [];

    // Pause all active tweens
    this.tweens.pauseAll();

    // Semi-transparent backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.7);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    backdrop.setDepth(20);
    this.pauseUIElements.push(backdrop);

    // PAUSED title
    const title = this.add.text(this.centerX, this.centerY - 80 * PX, 'PAUSED', {
      fontSize: `${64 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(0.5);
    title.setDepth(21);
    this.pauseUIElements.push(title);

    // Menu buttons
    const buttons: { label: string; action: () => void }[] = [
      { label: 'RESUME', action: () => this.togglePause() },
      { label: 'QUIT TO MENU', action: () => this.quitToMenu() },
    ];

    buttons.forEach(({ label, action }, index) => {
      const btnY = this.centerY + (40 + index * 70) * PX;
      const btn = this.add.text(this.centerX, btnY, label, {
        fontSize: `${32 * PX}px`,
        color: '#ffffff',
        fontFamily: "'Rajdhani', sans-serif",
        backgroundColor: '#444444',
        padding: { x: 24 * PX, y: 10 * PX },
      });
      btn.setOrigin(0.5);
      btn.setDepth(21);
      btn.setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => {
        this.pauseMenuIndex = index;
        this.updatePauseHighlight();
      });
      btn.on('pointerout', () => {
        btn.setStyle({ backgroundColor: '#444444' });
      });
      btn.on('pointerdown', () => action());

      this.pauseUIElements.push(btn);
      this.pauseMenuButtons.push(btn);
      this.pauseMenuActions.push(action);
    });

    this.updatePauseHighlight();
  }

  private updatePauseHighlight() {
    this.pauseMenuButtons.forEach((btn, i) => {
      btn.setStyle({ backgroundColor: i === this.pauseMenuIndex ? '#666666' : '#444444' });
    });
  }

  private updatePauseGamepadNavigation() {
    if (this.gamepadManager.isDpadDownJustPressed()) {
      this.pauseMenuIndex = (this.pauseMenuIndex + 1) % this.pauseMenuButtons.length;
      this.updatePauseHighlight();
    } else if (this.gamepadManager.isDpadUpJustPressed()) {
      this.pauseMenuIndex =
        (this.pauseMenuIndex - 1 + this.pauseMenuButtons.length) % this.pauseMenuButtons.length;
      this.updatePauseHighlight();
    }

    if (this.gamepadManager.isAJustPressed()) {
      this.pauseMenuActions[this.pauseMenuIndex]();
    }

    if (this.gamepadManager.isBJustPressed()) {
      this.togglePause();
    }
  }

  private hidePauseUI() {
    this.isPaused = false;
    this.pauseButton.setAlpha(0.5);
    this.pauseMenuButtons = [];
    this.pauseMenuActions = [];

    // Resume all tweens
    this.tweens.resumeAll();

    for (const el of this.pauseUIElements) {
      el.destroy();
    }
    this.pauseUIElements = [];
  }

  private quitToMenu() {
    // Clean up pause UI first (resumes tweens)
    this.hidePauseUI();

    // Clean up game state
    for (const shield of this.shields) {
      shield.destroy();
    }
    this.shields = [];

    for (const sweep of this.sweepShots) {
      sweep.destroy();
    }
    this.sweepShots = [];

    for (const flare of this.orbitalFlares) {
      flare.destroy();
    }
    this.orbitalFlares = [];
    for (const bullet of this.orbitalBullets) {
      bullet.destroy();
    }
    this.orbitalBullets = [];

    if (this.laserBeamTimer > 0) {
      this.laserBeamTimer = 0;
      this.laserGraphics.clear();
      this.player.setScale(1.0);
      this.audioManager.stopSound('laser');
    }

    for (const el of this.powerUpUIElements) {
      el.destroy();
    }
    this.powerUpUIElements = [];
    for (const el of this.equipUIElements) {
      el.destroy();
    }
    this.equipUIElements = [];

    this.scene.start('MainMenuScene');
  }

  // ─── Radial Power-Up Selection UI ─────────────────────────────────────

  private showPowerUpSelection(completedLevel: number) {
    this.isPowerUpSelectionActive = true;
    const nextLevel = completedLevel + 1;
    this.powerUpSelectedIndex = 0;
    this.powerUpItemTexts = [];

    // In benchmark mode, auto-select the first power-up
    if (BENCHMARK_MODE) {
      const selection = this.powerUpManager.getRandomPassiveSelection();
      if (selection.length > 0) {
        this.selectPowerUp(selection[0], nextLevel);
      }
      return;
    }

    // Save real terminal radius and collapse playfield visually
    this.savedTerminalRadius = this.terminalRadius;
    const collapsedR = 600 * PX;
    const terminalRatio = this.terminalRadius / PLAYFIELD_RADIUS;

    // Tween playfield visual radius down and terminal radius proportionally
    this.tweens.add({
      targets: this,
      playfieldVisualRadius: collapsedR,
      terminalRadius: terminalRatio * collapsedR,
      duration: 400,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        this.drawPlayfield();
        this.repositionHud(this.playfieldVisualRadius);
      },
      onComplete: () => {
        this.buildPassiveMenu(nextLevel);
      },
    });
  }

  private repositionHud(radius: number) {
    const hudPairs: {
      angleDeg: number;
      label: Phaser.GameObjects.Text;
      value: Phaser.GameObjects.Text;
    }[] = [
      { angleDeg: -12, label: this.streakLabel, value: this.streakValue },
      { angleDeg: -20, label: this.scoreLabel, value: this.scoreValue2 },
      { angleDeg: -28, label: this.levelLabel, value: this.levelValue },
      { angleDeg: -36, label: this.matterLabel, value: this.matterValue },
    ];

    const hudDist = radius + 15 * PX;
    for (const { angleDeg, label, value } of hudPairs) {
      const layout = this.radialTextLayout(angleDeg, hudDist);
      label.setPosition(layout.x, layout.y);

      const angle = (angleDeg * Math.PI) / 180;
      const lineOffset = 40 * PX;
      value.setPosition(
        layout.x + Math.sin(-angle) * lineOffset,
        layout.y + Math.cos(-angle) * lineOffset
      );
    }
    this.repositionPowerUpHud(radius);
  }

  private buildPassiveMenu(nextLevel: number) {
    // Backdrop matching game background, with hole for collapsed playfield
    const backdrop = this.add.graphics();
    backdrop.fillStyle(COLORS.background, 1);
    backdrop.beginPath();
    backdrop.arc(this.centerX, this.centerY, GAME_WIDTH, 0, Math.PI * 2, false);
    backdrop.arc(this.centerX, this.centerY, this.playfieldVisualRadius, 0, Math.PI * 2, true);
    backdrop.closePath();
    backdrop.fillPath();
    this.powerUpUIElements.push(backdrop);

    // Bring HUD elements above backdrop
    const hudElements = [
      this.streakLabel,
      this.streakValue,
      this.scoreLabel,
      this.scoreValue2,
      this.levelLabel,
      this.levelValue,
      this.matterLabel,
      this.matterValue,
      ...this.slotHudElements,
      ...this.powerUpHudElements,
    ];
    for (const el of hudElements) {
      this.children.bringToTop(el);
    }

    // Get 3 weighted-random power-ups
    const selection = this.powerUpManager.getRandomPassiveSelection();

    // Check if terminal shrink option is available (terminal has grown beyond initial)
    const shrinkAvailable = this.savedTerminalRadius > TERMINAL_RADIUS_INITIAL;

    // Layout: radial text on the left side, tilted to align with circle center
    const hudDist = this.playfieldVisualRadius + 15 * PX;
    const angStep = 10; // degrees between items
    const centerDeg = 192; // center item angle (degrees), left side
    const powerUpAngles = [centerDeg - angStep, centerDeg, centerDeg + angStep];
    const allAngles = [...powerUpAngles];
    if (shrinkAvailable) {
      allAngles.push(powerUpAngles[0] - angStep - 2); // Below power-ups with extra gap
    }
    this.powerUpSelectionData = { selection, nextLevel, angles: allAngles, shrinkAvailable };

    // Title above the items (higher on screen = after last item in angle order)
    const titleAngleDeg = powerUpAngles[2] + angStep;
    const titleLayout = this.radialTextLayout(titleAngleDeg, hudDist);
    const title = this.add.text(titleLayout.x, titleLayout.y, 'PASSIVES', {
      fontSize: `${HUD_FONT_SECONDARY}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(titleLayout.originX, 0.5);
    title.setRotation(titleLayout.rotation);
    this.powerUpUIElements.push(title);

    selection.forEach((powerUp, index) => {
      const rarityLabel = powerUp.rarity;
      const layout = this.radialTextLayout(powerUpAngles[index], hudDist);

      // Name (main line)
      const nameText = this.add.text(layout.x, layout.y, powerUp.name, {
        fontSize: `${52 * PX}px`,
        color: '#cccccc',
        fontFamily: "'Rajdhani', sans-serif",
      });
      nameText.setOrigin(layout.originX, 0.5);
      nameText.setRotation(layout.rotation);

      // Rarity label (below the name — offset perpendicular to the radial direction)
      const angle = (powerUpAngles[index] * Math.PI) / 180;
      const lineOffset = -40 * PX;
      const rx = layout.x + Math.sin(-angle) * lineOffset;
      const ry = layout.y + Math.cos(-angle) * lineOffset;
      const rarityText = this.add.text(rx, ry, rarityLabel, {
        fontSize: `${28 * PX}px`,
        color: '#888888',
        fontFamily: "'Rajdhani', sans-serif",
      });
      rarityText.setOrigin(layout.originX, 0.5);
      rarityText.setRotation(layout.rotation);

      // Hit area on the name text
      nameText.setInteractive({ useHandCursor: true });

      nameText.on('pointerover', () => {
        nameText.setColor('#ffffff');
        rarityText.setColor('#cccccc');
      });
      nameText.on('pointerout', () => {
        nameText.setColor('#cccccc');
        rarityText.setColor('#888888');
      });
      nameText.on('pointerdown', () => {
        this.selectPowerUp(powerUp, nextLevel);
      });

      // Pop in animation
      nameText.setScale(0);
      rarityText.setScale(0);
      this.tweens.add({
        targets: [nameText, rarityText],
        scale: 1,
        duration: 300,
        delay: index * 60,
        ease: 'Back.easeOut',
      });

      this.powerUpItemTexts.push({ name: nameText, rarity: rarityText });
      this.powerUpUIElements.push(nameText);
      this.powerUpUIElements.push(rarityText);
    });

    // Add terminal shrink option if available
    if (shrinkAvailable) {
      const shrinkAngleDeg = allAngles[selection.length];
      const shrinkLayout = this.radialTextLayout(shrinkAngleDeg, hudDist);

      const shrinkNameText = this.add.text(shrinkLayout.x, shrinkLayout.y, 'Terminal Shrink', {
        fontSize: `${52 * PX}px`,
        color: '#cc4444',
        fontFamily: "'Rajdhani', sans-serif",
      });
      shrinkNameText.setOrigin(shrinkLayout.originX, 0.5);
      shrinkNameText.setRotation(shrinkLayout.rotation);

      const shrinkAngle = (shrinkAngleDeg * Math.PI) / 180;
      const shrinkLineOffset = -40 * PX;
      const srx = shrinkLayout.x + Math.sin(-shrinkAngle) * shrinkLineOffset;
      const sry = shrinkLayout.y + Math.cos(-shrinkAngle) * shrinkLineOffset;
      const shrinkDescText = this.add.text(srx, sry, 'Shrink the terminal radius', {
        fontSize: `${28 * PX}px`,
        color: '#884444',
        fontFamily: "'Rajdhani', sans-serif",
      });
      shrinkDescText.setOrigin(shrinkLayout.originX, 0.5);
      shrinkDescText.setRotation(shrinkLayout.rotation);

      shrinkNameText.setInteractive({ useHandCursor: true });
      shrinkNameText.on('pointerover', () => {
        shrinkNameText.setColor('#ff6666');
        shrinkDescText.setColor('#cc6666');
      });
      shrinkNameText.on('pointerout', () => {
        shrinkNameText.setColor('#cc4444');
        shrinkDescText.setColor('#884444');
      });
      shrinkNameText.on('pointerdown', () => {
        this.selectTerminalShrink(nextLevel);
      });

      // Pop in animation
      shrinkNameText.setScale(0);
      shrinkDescText.setScale(0);
      this.tweens.add({
        targets: [shrinkNameText, shrinkDescText],
        scale: 1,
        duration: 300,
        delay: selection.length * 60,
        ease: 'Back.easeOut',
      });

      this.powerUpItemTexts.push({ name: shrinkNameText, rarity: shrinkDescText });
      this.powerUpUIElements.push(shrinkNameText);
      this.powerUpUIElements.push(shrinkDescText);
    }

    this.drawPowerUpHighlight();
  }

  private drawPowerUpHighlight() {
    const { shrinkAvailable, selection } = this.powerUpSelectionData;

    this.powerUpItemTexts.forEach((item, index) => {
      const isShrinkItem = shrinkAvailable && index === selection.length;
      const isSelected = index === this.powerUpSelectedIndex;

      if (isShrinkItem) {
        item.name.setColor(isSelected ? '#ff6666' : '#cc4444');
        item.name.setScale(isSelected ? 1.15 : 1);
        item.rarity.setColor(isSelected ? '#cc6666' : '#884444');
        item.rarity.setScale(isSelected ? 1.15 : 1);
      } else {
        item.name.setColor(isSelected ? '#ffffff' : '#cccccc');
        item.name.setScale(isSelected ? 1.15 : 1);
        item.rarity.setColor(isSelected ? '#cccccc' : '#888888');
        item.rarity.setScale(isSelected ? 1.15 : 1);
      }
    });
  }

  private updatePowerUpGamepadNavigation() {
    const { selection, nextLevel, angles, shrinkAvailable } = this.powerUpSelectionData;
    const totalItems = selection.length + (shrinkAvailable ? 1 : 0);
    if (!this.isPowerUpSelectionActive || totalItems === 0) return;

    // Left stick: find the item whose angle is closest to the stick direction
    const aimAngle = this.gamepadManager.getAimAngle();
    if (aimAngle !== null) {
      const stickDeg = ((aimAngle * 180) / Math.PI + 360) % 360;
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let i = 0; i < angles.length; i++) {
        const diff = Math.abs(((stickDeg - angles[i] + 540) % 360) - 180);
        if (diff < bestDist) {
          bestDist = diff;
          bestIndex = i;
        }
      }
      this.powerUpSelectedIndex = bestIndex;
      this.drawPowerUpHighlight();
    }

    // D-pad up/down as fallback
    let nav = 0;
    if (this.gamepadManager.isDpadDownJustPressed()) nav = 1;
    else if (this.gamepadManager.isDpadUpJustPressed()) nav = -1;
    if (nav !== 0) {
      this.powerUpSelectedIndex = Math.max(
        0,
        Math.min(totalItems - 1, this.powerUpSelectedIndex + nav)
      );
      this.drawPowerUpHighlight();
    }

    if (this.gamepadManager.isAJustPressed()) {
      if (this.powerUpSelectedIndex < selection.length) {
        this.selectPowerUp(selection[this.powerUpSelectedIndex], nextLevel);
      } else {
        this.selectTerminalShrink(nextLevel);
      }
    }
  }

  private selectPowerUp(powerUp: PowerUpDefinition, nextLevel: number) {
    this.powerUpManager.addPowerUp(powerUp.type);
    this.updatePowerUpHud();

    // savedTerminalRadius already holds the real value to restore to

    // Orbital Shield: shields will be spawned in updateShields on next frame

    // Destroy all power-up UI elements
    for (const el of this.powerUpUIElements) {
      el.destroy();
    }
    this.powerUpUIElements = [];
    this.powerUpItemTexts = [];
    this.powerUpSelectionData = { selection: [], nextLevel: 0, angles: [], shrinkAvailable: false };

    // Show consumable shop phase
    this.showConsumableShop(nextLevel);
  }

  private selectTerminalShrink(nextLevel: number) {
    // Apply shrink to the real saved terminal radius
    const shrinkAmount = 0.04 * PLAYFIELD_RADIUS;
    this.savedTerminalRadius = Math.max(
      this.savedTerminalRadius - shrinkAmount,
      TERMINAL_RADIUS_INITIAL
    );

    // Compute proportional target for the collapsed playfield
    const targetTerminal =
      this.savedTerminalRadius * (this.playfieldVisualRadius / PLAYFIELD_RADIUS);

    // Destroy all power-up UI elements
    for (const el of this.powerUpUIElements) {
      el.destroy();
    }
    this.powerUpUIElements = [];
    this.powerUpItemTexts = [];
    this.powerUpSelectionData = { selection: [], nextLevel: 0, angles: [], shrinkAvailable: false };

    // Animate the terminal shrink visually before proceeding
    this.audioManager.playSound('terminalShrink');
    this.tweens.add({
      targets: this,
      terminalRadius: targetTerminal,
      duration: 300,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        this.drawPlayfield();
      },
      onComplete: () => {
        this.showConsumableShop(nextLevel);
      },
    });
  }

  private showConsumableShop(nextLevel: number) {
    // In benchmark mode, skip consumable shop entirely
    if (BENCHMARK_MODE) {
      this.isPowerUpSelectionActive = false;
      this.levelManager.startLevel(nextLevel);
      return;
    }

    const consumables = this.powerUpManager.getRandomConsumableSelection(3);

    // If no consumables available, skip to equip screen or restore
    if (consumables.length === 0) {
      if (this.powerUpManager.hasAnyConsumables()) {
        this.showEquipScreen(nextLevel);
      } else {
        this.restorePlayfield(nextLevel);
      }
      return;
    }

    this.shopSelectedIndex = 0;
    this.shopItemTexts = [];

    const hudDist = this.playfieldVisualRadius + 15 * PX;
    const angStep = 10;
    const centerDeg = -12; // RIGHT side, mirroring the passive menu's left side
    const itemAngles = [centerDeg + angStep, centerDeg, centerDeg - angStep];
    const doneAngleDeg = itemAngles[2] - angStep - 2;
    const allAngles = [...itemAngles.slice(0, consumables.length), doneAngleDeg];

    this.shopSelectionData = {
      consumables,
      nextLevel,
      angles: allAngles,
      purchased: new Set(),
    };

    // Backdrop ring (same as passive menu)
    const backdrop = this.add.graphics();
    backdrop.fillStyle(COLORS.background, 1);
    backdrop.beginPath();
    backdrop.arc(this.centerX, this.centerY, GAME_WIDTH, 0, Math.PI * 2, false);
    backdrop.arc(this.centerX, this.centerY, this.playfieldVisualRadius, 0, Math.PI * 2, true);
    backdrop.closePath();
    backdrop.fillPath();
    this.shopUIElements.push(backdrop);

    // Bring HUD elements above backdrop
    const hudEls = [
      this.streakLabel,
      this.streakValue,
      this.scoreLabel,
      this.scoreValue2,
      this.levelLabel,
      this.levelValue,
      this.matterLabel,
      this.matterValue,
      ...this.slotHudElements,
      ...this.powerUpHudElements,
    ];
    for (const el of hudEls) {
      this.children.bringToTop(el);
    }

    // Title
    const titleAngleDeg = itemAngles[0] + angStep;
    const titleLayout = this.radialTextLayout(titleAngleDeg, hudDist);
    const title = this.add.text(titleLayout.x, titleLayout.y, 'CONSUMABLES', {
      fontSize: `${HUD_FONT_SECONDARY}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(titleLayout.originX, 0.5);
    title.setRotation(titleLayout.rotation);
    this.shopUIElements.push(title);

    // Matter balance below title
    const balAngle = (titleAngleDeg * Math.PI) / 180;
    const balLineOffset = -40 * PX;
    const balLayout = this.radialTextLayout(titleAngleDeg, hudDist);
    const balX = balLayout.x + Math.sin(-balAngle) * balLineOffset;
    const balY = balLayout.y + Math.cos(-balAngle) * balLineOffset;
    const balText = this.add.text(balX, balY, `MATTER: ${this.scoreManager.getMatter()}`, {
      fontSize: `${28 * PX}px`,
      color: '#aaaaaa',
      fontFamily: "'Rajdhani', sans-serif",
    });
    balText.setOrigin(balLayout.originX, 0.5);
    balText.setRotation(balLayout.rotation);
    this.shopUIElements.push(balText);
    this.shopBalanceText = balText;

    // Shop items
    consumables.forEach((consumable, index) => {
      const cost = CONSUMABLE_MATTER_COST[consumable.rarity];
      const affordable = this.scoreManager.getMatter() >= cost;
      const layout = this.radialTextLayout(itemAngles[index], hudDist);

      const nameText = this.add.text(layout.x, layout.y, consumable.name, {
        fontSize: `${52 * PX}px`,
        color: affordable ? '#cccccc' : '#555555',
        fontFamily: "'Rajdhani', sans-serif",
      });
      nameText.setOrigin(layout.originX, 0.5);
      nameText.setRotation(layout.rotation);

      const angle = (itemAngles[index] * Math.PI) / 180;
      const lineOffset = -40 * PX;
      const rx = layout.x + Math.sin(-angle) * lineOffset;
      const ry = layout.y + Math.cos(-angle) * lineOffset;
      const costText = this.add.text(rx, ry, `${consumable.rarity} — ${cost}`, {
        fontSize: `${28 * PX}px`,
        color: affordable ? '#888888' : '#444444',
        fontFamily: "'Rajdhani', sans-serif",
      });
      costText.setOrigin(layout.originX, 0.5);
      costText.setRotation(layout.rotation);

      if (affordable) {
        nameText.setInteractive({ useHandCursor: true });
        nameText.on('pointerover', () => {
          if (this.shopSelectionData.purchased.has(index)) return;
          nameText.setColor('#ffffff');
          costText.setColor('#cccccc');
        });
        nameText.on('pointerout', () => {
          if (this.shopSelectionData.purchased.has(index)) return;
          nameText.setColor('#cccccc');
          costText.setColor('#888888');
        });
        nameText.on('pointerdown', () => {
          this.purchaseConsumable(index, this.shopBalanceText!);
        });
      }

      // Pop in animation
      nameText.setScale(0);
      costText.setScale(0);
      this.tweens.add({
        targets: [nameText, costText],
        scale: 1,
        duration: 300,
        delay: index * 60,
        ease: 'Back.easeOut',
      });

      this.shopItemTexts.push({ name: nameText, cost: costText });
      this.shopUIElements.push(nameText);
      this.shopUIElements.push(costText);
    });

    // DONE option
    const doneLayout = this.radialTextLayout(doneAngleDeg, hudDist);
    const doneNameText = this.add.text(doneLayout.x, doneLayout.y, 'Done', {
      fontSize: `${52 * PX}px`,
      color: '#44cc55',
      fontFamily: "'Rajdhani', sans-serif",
    });
    doneNameText.setOrigin(doneLayout.originX, 0.5);
    doneNameText.setRotation(doneLayout.rotation);

    const doneAngle = (doneAngleDeg * Math.PI) / 180;
    const doneLineOffset = -40 * PX;
    const drx = doneLayout.x + Math.sin(-doneAngle) * doneLineOffset;
    const dry = doneLayout.y + Math.cos(-doneAngle) * doneLineOffset;
    const doneDescText = this.add.text(drx, dry, 'Proceed to next level', {
      fontSize: `${28 * PX}px`,
      color: '#338844',
      fontFamily: "'Rajdhani', sans-serif",
    });
    doneDescText.setOrigin(doneLayout.originX, 0.5);
    doneDescText.setRotation(doneLayout.rotation);

    doneNameText.setInteractive({ useHandCursor: true });
    doneNameText.on('pointerover', () => {
      doneNameText.setColor('#66ee77');
      doneDescText.setColor('#44cc55');
    });
    doneNameText.on('pointerout', () => {
      doneNameText.setColor('#44cc55');
      doneDescText.setColor('#338844');
    });
    doneNameText.on('pointerdown', () => {
      this.closeConsumableShop();
    });

    doneNameText.setScale(0);
    doneDescText.setScale(0);
    this.tweens.add({
      targets: [doneNameText, doneDescText],
      scale: 1,
      duration: 300,
      delay: consumables.length * 60,
      ease: 'Back.easeOut',
    });

    this.shopItemTexts.push({ name: doneNameText, cost: doneDescText });
    this.shopUIElements.push(doneNameText);
    this.shopUIElements.push(doneDescText);

    this.drawShopHighlight();
  }

  private purchaseConsumable(index: number, balText: Phaser.GameObjects.Text) {
    const { consumables, purchased } = this.shopSelectionData;
    if (purchased.has(index)) return;
    const consumable = consumables[index];
    const cost = CONSUMABLE_MATTER_COST[consumable.rarity];

    if (!this.scoreManager.spendMatter(cost)) return;

    this.powerUpManager.addPowerUp(consumable.type);
    purchased.add(index);

    // Update matter balance display
    balText.setText(`MATTER: ${this.scoreManager.getMatter()}`);
    this.updateStreakHud();

    // Grey out purchased item
    const item = this.shopItemTexts[index];
    item.name.setColor('#335533');
    item.cost.setColor('#223322');
    item.name.removeInteractive();

    // Refresh affordability of remaining items
    for (let i = 0; i < consumables.length; i++) {
      if (purchased.has(i)) continue;
      const c = consumables[i];
      const cCost = CONSUMABLE_MATTER_COST[c.rarity];
      const canAfford = this.scoreManager.getMatter() >= cCost;
      const shopItem = this.shopItemTexts[i];
      if (!canAfford) {
        shopItem.name.setColor('#555555');
        shopItem.cost.setColor('#444444');
        shopItem.name.removeInteractive();
      }
    }
  }

  private drawShopHighlight() {
    const { consumables, purchased } = this.shopSelectionData;

    this.shopItemTexts.forEach((item, index) => {
      const isDoneItem = index === consumables.length;
      const isSelected = index === this.shopSelectedIndex;
      const isPurchased = purchased.has(index);

      if (isDoneItem) {
        item.name.setColor(isSelected ? '#66ee77' : '#44cc55');
        item.name.setScale(isSelected ? 1.15 : 1);
        item.cost.setColor(isSelected ? '#44cc55' : '#338844');
        item.cost.setScale(isSelected ? 1.15 : 1);
      } else if (isPurchased) {
        item.name.setColor('#335533');
        item.name.setScale(1);
        item.cost.setColor('#223322');
        item.cost.setScale(1);
      } else {
        const consumable = consumables[index];
        const cost = CONSUMABLE_MATTER_COST[consumable.rarity];
        const affordable = this.scoreManager.getMatter() >= cost;

        if (affordable) {
          item.name.setColor(isSelected ? '#ffffff' : '#cccccc');
          item.name.setScale(isSelected ? 1.15 : 1);
          item.cost.setColor(isSelected ? '#cccccc' : '#888888');
          item.cost.setScale(isSelected ? 1.15 : 1);
        } else {
          item.name.setColor('#555555');
          item.name.setScale(1);
          item.cost.setColor('#444444');
          item.cost.setScale(1);
        }
      }
    });
  }

  private updateShopGamepadNavigation() {
    const { consumables, angles } = this.shopSelectionData;
    const totalItems = consumables.length + 1; // +1 for DONE
    if (!this.isPowerUpSelectionActive || totalItems === 0) return;
    if (this.shopUIElements.length === 0) return; // shop not active

    // Left stick navigation
    const aimAngle = this.gamepadManager.getAimAngle();
    if (aimAngle !== null) {
      const stickDeg = ((aimAngle * 180) / Math.PI + 360) % 360;
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let i = 0; i < angles.length; i++) {
        const diff = Math.abs(((stickDeg - angles[i] + 540) % 360) - 180);
        if (diff < bestDist) {
          bestDist = diff;
          bestIndex = i;
        }
      }
      this.shopSelectedIndex = bestIndex;
      this.drawShopHighlight();
    }

    // D-pad
    let nav = 0;
    if (this.gamepadManager.isDpadDownJustPressed()) nav = 1;
    else if (this.gamepadManager.isDpadUpJustPressed()) nav = -1;
    if (nav !== 0) {
      this.shopSelectedIndex = Math.max(0, Math.min(totalItems - 1, this.shopSelectedIndex + nav));
      this.drawShopHighlight();
    }

    // A button to select
    if (this.gamepadManager.isAJustPressed()) {
      if (this.shopSelectedIndex < consumables.length && this.shopBalanceText) {
        this.purchaseConsumable(this.shopSelectedIndex, this.shopBalanceText);
        this.drawShopHighlight();
      } else {
        this.closeConsumableShop();
      }
    }
  }

  private closeConsumableShop() {
    const nextLevel = this.shopSelectionData.nextLevel;

    for (const el of this.shopUIElements) {
      el.destroy();
    }
    this.shopUIElements = [];
    this.shopItemTexts = [];
    this.shopBalanceText = null;
    this.shopSelectionData = { consumables: [], nextLevel: 0, angles: [], purchased: new Set() };

    if (this.powerUpManager.hasAnyConsumables()) {
      this.showEquipScreen(nextLevel);
    } else {
      this.restorePlayfield(nextLevel);
    }
  }

  private restorePlayfield(nextLevel: number) {
    // Expand playfield back to full size with terminal radius restoring proportionally
    this.tweens.add({
      targets: this,
      playfieldVisualRadius: PLAYFIELD_RADIUS,
      terminalRadius: this.savedTerminalRadius,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.drawPlayfield();
        this.repositionHud(this.playfieldVisualRadius);
      },
      onComplete: () => {
        this.isPowerUpSelectionActive = false;
        this.levelManager.startLevel(nextLevel);
      },
    });
  }

  // ─── Equip Consumables Screen ─────────────────────────────────────────

  private showEquipScreen(nextLevel: number) {
    // In benchmark mode, skip equip screen entirely
    if (BENCHMARK_MODE) {
      this.isPowerUpSelectionActive = false;
      this.levelManager.startLevel(nextLevel);
      return;
    }

    this.nextLevelForEquipScreen = nextLevel;
    // isPowerUpSelectionActive stays true to keep game paused
    this.renderEquipScreen();
  }

  private renderEquipScreen() {
    // Clear previous equip UI
    for (const el of this.equipUIElements) {
      el.destroy();
    }
    this.equipUIElements = [];

    // Backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.7);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.equipUIElements.push(backdrop);

    // Title
    const title = this.add.text(this.centerX, this.centerY - 350 * PX, 'EQUIP CONSUMABLES', {
      fontSize: `${42 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
    });
    title.setOrigin(0.5);
    this.equipUIElements.push(title);

    const subtitle = this.add.text(
      this.centerX,
      this.centerY - 290 * PX,
      `Inventory: ${this.powerUpManager.getTotalConsumableCount()} / ${MAX_CONSUMABLE_INVENTORY}`,
      {
        fontSize: `${22 * PX}px`,
        color: '#aaaaaa',
        fontFamily: "'Rajdhani', sans-serif",
      }
    );
    subtitle.setOrigin(0.5);
    this.equipUIElements.push(subtitle);

    const hint = this.add.text(
      this.centerX,
      this.centerY - 255 * PX,
      'Click an inventory item to equip. Click an equipped slot to unequip.',
      {
        fontSize: `${16 * PX}px`,
        color: '#666666',
        fontFamily: "'Rajdhani', sans-serif",
      }
    );
    hint.setOrigin(0.5);
    this.equipUIElements.push(hint);

    // ─── 4 Equip Slots ───
    for (let i = 0; i < MAX_EQUIPPED_SLOTS; i++) {
      const slotX = this.centerX + (i - 1.5) * 200 * PX;
      const slotY = this.centerY - 150 * PX;
      const equipped = this.powerUpManager.getEquippedSlot(i);

      const slotGfx = this.add.graphics();

      if (equipped) {
        const def = getConsumableDefinition(equipped);
        const rarityColor = def ? RARITY_COLORS[def.rarity] : 0xffffff;

        // Filled slot
        slotGfx.fillStyle(0x444444, 0.9);
        slotGfx.fillRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);
        slotGfx.lineStyle(2 * PX, rarityColor, 0.8);
        slotGfx.strokeRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);

        this.equipUIElements.push(slotGfx);

        // Slot number
        const slotNum = this.add.text(slotX, slotY - 25 * PX, `[${i + 1}]`, {
          fontSize: `${16 * PX}px`,
          color: '#888888',
          fontFamily: "'Rajdhani', sans-serif",
        });
        slotNum.setOrigin(0.5);
        this.equipUIElements.push(slotNum);

        // Item name
        const itemName = this.add.text(slotX, slotY + 5 * PX, def?.name ?? equipped, {
          fontSize: `${20 * PX}px`,
          color: '#ffffff',
          fontFamily: "'Rajdhani', sans-serif",
        });
        itemName.setOrigin(0.5);
        this.equipUIElements.push(itemName);

        // Click to unequip
        const hitArea = this.add.rectangle(slotX, slotY, 160 * PX, 90 * PX, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => {
          this.powerUpManager.unequipSlot(i);
          this.renderEquipScreen();
        });
        hitArea.on('pointerover', () => {
          slotGfx.clear();
          slotGfx.fillStyle(0x555555, 0.95);
          slotGfx.fillRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);
          slotGfx.lineStyle(3 * PX, rarityColor, 1);
          slotGfx.strokeRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);
        });
        hitArea.on('pointerout', () => {
          slotGfx.clear();
          slotGfx.fillStyle(0x444444, 0.9);
          slotGfx.fillRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);
          slotGfx.lineStyle(2 * PX, rarityColor, 0.8);
          slotGfx.strokeRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);
        });
        this.equipUIElements.push(hitArea);
      } else {
        // Empty slot
        slotGfx.fillStyle(0x222222, 0.7);
        slotGfx.fillRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);
        slotGfx.lineStyle(2 * PX, 0x666666, 0.4);
        slotGfx.strokeRoundedRect(slotX - 80 * PX, slotY - 45 * PX, 160 * PX, 90 * PX, 12 * PX);

        this.equipUIElements.push(slotGfx);

        const slotNum = this.add.text(slotX, slotY - 10 * PX, `[${i + 1}]`, {
          fontSize: `${16 * PX}px`,
          color: '#666666',
          fontFamily: "'Rajdhani', sans-serif",
        });
        slotNum.setOrigin(0.5);
        this.equipUIElements.push(slotNum);

        const emptyText = this.add.text(slotX, slotY + 15 * PX, 'Empty', {
          fontSize: `${16 * PX}px`,
          color: '#555555',
          fontFamily: "'Rajdhani', sans-serif",
        });
        emptyText.setOrigin(0.5);
        this.equipUIElements.push(emptyText);
      }
    }

    // ─── Inventory Section ───
    const invEntries = this.powerUpManager.getInventoryEntries();

    if (invEntries.length > 0) {
      const invTitle = this.add.text(this.centerX, this.centerY + 20 * PX, 'INVENTORY', {
        fontSize: `${22 * PX}px`,
        color: '#aaaaaa',
        fontFamily: "'Rajdhani', sans-serif",
      });
      invTitle.setOrigin(0.5);
      this.equipUIElements.push(invTitle);

      invEntries.forEach((entry, idx) => {
        const itemY = this.centerY + (80 + idx * 60) * PX;
        const def = getConsumableDefinition(entry.type);
        const name = def?.name ?? entry.type;
        const rarityColor = def ? RARITY_COLORS[def.rarity] : 0xaaaaaa;

        // Item background
        const itemGfx = this.add.graphics();
        itemGfx.fillStyle(0x333333, 0.8);
        itemGfx.fillRoundedRect(
          this.centerX - 200 * PX,
          itemY - 22 * PX,
          400 * PX,
          44 * PX,
          8 * PX
        );
        itemGfx.lineStyle(2 * PX, rarityColor, 0.5);
        itemGfx.strokeRoundedRect(
          this.centerX - 200 * PX,
          itemY - 22 * PX,
          400 * PX,
          44 * PX,
          8 * PX
        );
        this.equipUIElements.push(itemGfx);

        // Item text
        const itemText = this.add.text(this.centerX, itemY, `${name}  x${entry.count}`, {
          fontSize: `${22 * PX}px`,
          color: '#ffffff',
          fontFamily: "'Rajdhani', sans-serif",
        });
        itemText.setOrigin(0.5);
        this.equipUIElements.push(itemText);

        // Click to equip to first empty slot
        const hitArea = this.add.rectangle(this.centerX, itemY, 400 * PX, 44 * PX, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => {
          // Find first empty slot
          for (let s = 0; s < MAX_EQUIPPED_SLOTS; s++) {
            if (!this.powerUpManager.getEquippedSlot(s)) {
              this.powerUpManager.equipToSlot(s, entry.type);
              this.renderEquipScreen();
              return;
            }
          }
        });
        hitArea.on('pointerover', () => {
          itemGfx.clear();
          itemGfx.fillStyle(0x444444, 0.9);
          itemGfx.fillRoundedRect(
            this.centerX - 200 * PX,
            itemY - 22 * PX,
            400 * PX,
            44 * PX,
            8 * PX
          );
          itemGfx.lineStyle(3 * PX, rarityColor, 0.8);
          itemGfx.strokeRoundedRect(
            this.centerX - 200 * PX,
            itemY - 22 * PX,
            400 * PX,
            44 * PX,
            8 * PX
          );
        });
        hitArea.on('pointerout', () => {
          itemGfx.clear();
          itemGfx.fillStyle(0x333333, 0.8);
          itemGfx.fillRoundedRect(
            this.centerX - 200 * PX,
            itemY - 22 * PX,
            400 * PX,
            44 * PX,
            8 * PX
          );
          itemGfx.lineStyle(2 * PX, rarityColor, 0.5);
          itemGfx.strokeRoundedRect(
            this.centerX - 200 * PX,
            itemY - 22 * PX,
            400 * PX,
            44 * PX,
            8 * PX
          );
        });
        this.equipUIElements.push(hitArea);
      });
    } else {
      const emptyInv = this.add.text(
        this.centerX,
        this.centerY + 60 * PX,
        'All consumables are equipped',
        {
          fontSize: `${20 * PX}px`,
          color: '#666666',
          fontFamily: "'Rajdhani', sans-serif",
        }
      );
      emptyInv.setOrigin(0.5);
      this.equipUIElements.push(emptyInv);
    }

    // ─── READY Button ───
    const readyY = this.centerY + 320 * PX;

    const readyGfx = this.add.graphics();
    readyGfx.fillStyle(0x228833, 0.9);
    readyGfx.fillRoundedRect(this.centerX - 100 * PX, readyY - 30 * PX, 200 * PX, 60 * PX, 12 * PX);
    readyGfx.lineStyle(2 * PX, 0x44cc55, 0.8);
    readyGfx.strokeRoundedRect(
      this.centerX - 100 * PX,
      readyY - 30 * PX,
      200 * PX,
      60 * PX,
      12 * PX
    );
    this.equipUIElements.push(readyGfx);

    const readyText = this.add.text(this.centerX, readyY, 'READY', {
      fontSize: `${28 * PX}px`,
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
      fontStyle: 'bold',
    });
    readyText.setOrigin(0.5);
    this.equipUIElements.push(readyText);

    const readyHit = this.add.rectangle(this.centerX, readyY, 200 * PX, 60 * PX, 0x000000, 0);
    readyHit.setInteractive({ useHandCursor: true });
    readyHit.on('pointerdown', () => {
      this.confirmEquipment();
    });
    readyHit.on('pointerover', () => {
      readyGfx.clear();
      readyGfx.fillStyle(0x33aa44, 0.95);
      readyGfx.fillRoundedRect(
        this.centerX - 100 * PX,
        readyY - 30 * PX,
        200 * PX,
        60 * PX,
        12 * PX
      );
      readyGfx.lineStyle(3 * PX, 0x66ee77, 1);
      readyGfx.strokeRoundedRect(
        this.centerX - 100 * PX,
        readyY - 30 * PX,
        200 * PX,
        60 * PX,
        12 * PX
      );
    });
    readyHit.on('pointerout', () => {
      readyGfx.clear();
      readyGfx.fillStyle(0x228833, 0.9);
      readyGfx.fillRoundedRect(
        this.centerX - 100 * PX,
        readyY - 30 * PX,
        200 * PX,
        60 * PX,
        12 * PX
      );
      readyGfx.lineStyle(2 * PX, 0x44cc55, 0.8);
      readyGfx.strokeRoundedRect(
        this.centerX - 100 * PX,
        readyY - 30 * PX,
        200 * PX,
        60 * PX,
        12 * PX
      );
    });
    this.equipUIElements.push(readyHit);
  }

  private confirmEquipment() {
    for (const el of this.equipUIElements) {
      el.destroy();
    }
    this.equipUIElements = [];

    this.restorePlayfield(this.nextLevelForEquipScreen);
  }

  // ─── Game Over ────────────────────────────────────────────────────────

  private gameOver() {
    // Clean up shields
    for (const shield of this.shields) {
      shield.destroy();
    }
    this.shields = [];
    this.shieldRotation = 0;

    // Clean up sweep shots
    for (const sweep of this.sweepShots) {
      sweep.destroy();
    }
    this.sweepShots = [];

    // Clean up orbital flares & bullets
    for (const flare of this.orbitalFlares) {
      flare.destroy();
    }
    this.orbitalFlares = [];
    for (const bullet of this.orbitalBullets) {
      bullet.destroy();
    }
    this.orbitalBullets = [];

    // Clean up laser beam
    this.laserBeamTimer = 0;
    this.laserGraphics.clear();
    this.player.setScale(1.0);
    this.audioManager.stopSound('laser');

    // Clean up any active UI
    for (const el of this.powerUpUIElements) {
      el.destroy();
    }
    this.powerUpUIElements = [];
    for (const el of this.equipUIElements) {
      el.destroy();
    }
    this.equipUIElements = [];

    this.audioManager.playSound('gameOver');
    this.scene.start('GameOverScene', {
      score: this.scoreManager.getScore(),
      level: this.levelManager.getCurrentLevel(),
    });
  }
}
