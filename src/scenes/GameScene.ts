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
  SHIELD_MAX_SLOTS,
  SHIELD_ORBIT_SPEED,
  PX,
} from '../constants';
import Player from '../entities/Player';
import Enemy from '../entities/Enemy';
import Bullet from '../entities/Bullet';
import OrbitalShield from '../entities/OrbitalShield';
import ScoreManager from '../managers/ScoreManager';
import LevelManager from '../managers/LevelManager';
import AudioManager from '../managers/AudioManager';
import PowerUpManager, {
  PowerUpType,
  RARITY_COLORS,
  MAX_EQUIPPED_SLOTS,
  MAX_CONSUMABLE_INVENTORY,
  getConsumableDefinition,
  type PowerUpDefinition,
} from '../managers/PowerUpManager';
import GamepadManager from '../managers/GamepadManager';
import { distance } from '../utils/MathUtils';
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
  private shieldRotation: number = 0;
  private scoreManager!: ScoreManager;
  private levelManager!: LevelManager;
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
  private isPowerUpSelectionActive: boolean = false;
  private powerUpUIElements: Phaser.GameObjects.GameObject[] = [];
  private powerUpSelectedIndex: number = 0;
  private powerUpCardHighlights: Phaser.GameObjects.Graphics[] = [];
  private powerUpSelectionData: { selection: PowerUpDefinition[]; nextLevel: number } = {
    selection: [],
    nextLevel: 0,
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

  // Equip screen state
  private equipUIElements: Phaser.GameObjects.GameObject[] = [];
  private nextLevelForEquipScreen: number = 0;

  // Streak HUD
  private streakLabel!: Phaser.GameObjects.Text;
  private streakValue!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private levelValue!: Phaser.GameObjects.Text;
  private scoreLabel!: Phaser.GameObjects.Text;
  private scoreValue2!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private benchmarkText!: Phaser.GameObjects.Text;
  private benchmarkDone: boolean = false;

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
    this.powerUpManager = new PowerUpManager();
    this.gamepadManager = new GamepadManager(this);

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

    // Set up consumable keybindings
    this.setupConsumableKeys();

    // Create consumable HUD
    this.createConsumableHud();

    // Create streak HUD
    this.createStreakHud();

    // Animate UI elements in with overshoot
    this.animateHudEntrance();

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
    const angle = (angleDeg * Math.PI) / 180;
    const hudDist = PLAYFIELD_RADIUS + 15 * PX;
    const hudX = this.centerX + Math.cos(angle) * hudDist;
    const hudY = this.centerY + Math.sin(angle) * hudDist;
    const color = '#' + COLORS.playfield.toString(16).padStart(6, '0');

    const labelText = this.add.text(hudX, hudY, label, {
      fontSize: `${32 * PX}px`,
      color,
      fontFamily: "'Rajdhani', sans-serif",
    });
    labelText.setOrigin(0, 0);
    labelText.setRotation(angle);

    const lineOffset = 40 * PX;
    const valueX = hudX + Math.sin(-angle) * lineOffset;
    const valueY = hudY + Math.cos(-angle) * lineOffset;
    const valueText = this.add.text(valueX, valueY, '0', {
      fontSize: `${58 * PX}px`,
      color,
      fontFamily: "'Rajdhani', sans-serif",
    });
    valueText.setOrigin(0, 0);
    valueText.setRotation(angle);

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
  }

  private animateHudEntrance() {
    const hudElements: Phaser.GameObjects.Text[] = [
      this.streakLabel,
      this.streakValue,
      this.scoreLabel,
      this.scoreValue2,
      this.levelLabel,
      this.levelValue,
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
    }
  }

  private activateShockwave() {
    // Visual effect
    ParticleEffects.createShockwaveEffect(this, this.centerX, this.centerY);
    this.cameras.main.shake(200, 0.008);
    this.audioManager.playSound('terminalGrow');

    // Kill all enemies
    for (const enemy of this.enemies) {
      if (enemy.active) {
        const bounds = enemy.getBounds();
        ParticleEffects.createEnemyDeathParticles(this, bounds.x, bounds.y);
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

    this.cameras.main.shake(100, 0.005);
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

    // Chaotic player pulsation while beam is active (after tween-in)
    if (this.laserScaleUpDone) {
      this.player.setScale(1.8 + Math.random() * 0.4);
    }

    const pointer = this.input.activePointer;
    const aimAngle = Math.atan2(pointer.y - this.player.y, pointer.x - this.player.x);

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
        this.processChainLightning(bounds.x, bounds.y);
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

    // Draw playfield circle (with tremble offset)
    const trembleOffset =
      this.playfieldTremble > 0 ? (Math.random() - 0.5) * this.playfieldTremble : 0;
    this.playfieldGraphics.fillStyle(COLORS.playfield, 1);
    this.playfieldGraphics.fillCircle(this.centerX, this.centerY, PLAYFIELD_RADIUS + trembleOffset);

    // Draw vision radius edge (subtle indicator)
    if (this.visionRadius < PLAYFIELD_RADIUS) {
      this.playfieldGraphics.lineStyle(4 * PX, 0xffffff, 0.2);
      this.playfieldGraphics.strokeCircle(this.centerX, this.centerY, this.visionRadius);
    }

    // Draw terminal radius hint (danger zone)
    if (this.terminalRadius > 0) {
      this.playfieldGraphics.lineStyle(2 * PX, COLORS.terminalRadiusHint, 1);
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
    // Lock delta in benchmark mode for frame-perfect determinism
    if (BENCHMARK_MODE) {
      delta = 16.667;
    }

    // FPS display
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);

    // Update blur effect every frame
    this.updateBlurEffect();

    // Pause game while power-up selection, equip screen, or benchmark end is active
    if (this.isPowerUpSelectionActive || this.benchmarkDone) {
      this.updatePowerUpGamepadNavigation();
      this.gamepadManager.updatePrevState();
      return;
    }

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
    const shootInfo = this.player.update(
      time,
      delta,
      this.powerUpManager.getFireCooldown(),
      aimTarget
    );
    if (shootInfo.shouldShoot && this.laserBeamTimer <= 0) {
      this.shoot(shootInfo.targetX, shootInfo.targetY);
    }

    // Update level manager and spawn enemies
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

    // Check collisions
    this.checkCollisions();

    // Check shield-enemy collisions
    this.checkShieldCollisions();

    // Check level completion
    if (this.levelManager.isLevelComplete(this.enemies.length)) {
      const completedLevel = this.levelManager.getCurrentLevel();
      this.levelManager.completeLevel();

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
    const randomAngle = gameRandom() * Math.PI * 2;
    const health = this.rollEnemyHealth();
    const enemy = new Enemy(this, randomAngle, this.centerX, this.centerY, health);
    this.enemies.push(enemy);
  }

  private rollEnemyHealth(): number {
    const playerLevel = this.levelManager.getCurrentLevel();
    const weights: { level: number; weight: number }[] = [];

    for (let L = 1; ; L++) {
      const threshold = L === 1 ? 0 : ENEMY_LEVEL_GAP * (L - 1) - 1;
      if (playerLevel < threshold) break;
      const raw = playerLevel - threshold + 1;
      weights.push({ level: L, weight: Math.pow(raw, ENEMY_LEVEL_EXP) });
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
        const dist = distance(bulletBounds.x, bulletBounds.y, enemyBounds.x, enemyBounds.y);

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

          const killed = enemy.hit();
          if (killed) {
            this.enemies.splice(j, 1);
            this.scoreManager.addKill(enemy.tier);
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
          this.processChainLightning(hitX, hitY);

          if (isFirstHit) {
            this.scoreManager.incrementHitStreak();
          }

          if (!bulletSurvives) break;
        }
      }
    }
  }

  private processChainLightning(originX: number, originY: number) {
    const chainCount = this.powerUpManager.getChainCount();
    if (chainCount <= 0) return;

    const chainRange = this.powerUpManager.getChainRange();
    let chainsRemaining = chainCount;
    let currentX = originX;
    let currentY = originY;
    const hitSet = new Set<Enemy>();
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
      closestEnemy.destroy();
      this.scoreManager.addKill(closestEnemy.tier);

      chainsRemaining--;
    }

    // Clean up destroyed enemies
    this.enemies = this.enemies.filter((e) => e.active);
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

          // Chain lightning from shield kills too
          this.processChainLightning(hitX, hitY);

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

  private onEnemyReachedPlayer(enemy: Enemy) {
    enemy.destroy();
    const newVisionRadius = this.visionRadius - this.powerUpManager.getVisionRadiusDecrease();
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

  // ─── Radial Power-Up Selection UI ─────────────────────────────────────

  private showPowerUpSelection(completedLevel: number) {
    this.isPowerUpSelectionActive = true;
    const nextLevel = completedLevel + 1;
    this.powerUpSelectedIndex = 0;
    this.powerUpCardHighlights = [];

    // In benchmark mode, auto-select the first power-up
    if (BENCHMARK_MODE) {
      const selection = this.powerUpManager.getRandomSelection();
      if (selection.length > 0) {
        this.selectPowerUp(selection[0], nextLevel);
      }
      return;
    }

    // Semi-transparent backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.7);
    backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.powerUpUIElements.push(backdrop);

    // Title at top
    const title = this.add.text(
      this.centerX,
      this.centerY - 420 * PX,
      `LEVEL ${completedLevel} COMPLETE`,
      {
        fontSize: `${48 * PX}px`,
        color: '#ffffff',
        fontFamily: "'Rajdhani', sans-serif",
      }
    );
    title.setOrigin(0.5);
    this.powerUpUIElements.push(title);

    const subtitle = this.add.text(this.centerX, this.centerY - 360 * PX, 'Choose a Power-Up', {
      fontSize: `${28 * PX}px`,
      color: '#cccccc',
      fontFamily: "'Rajdhani', sans-serif",
    });
    subtitle.setOrigin(0.5);
    this.powerUpUIElements.push(subtitle);

    // Get 3 weighted-random power-ups
    const selection = this.powerUpManager.getRandomSelection();
    this.powerUpSelectionData = { selection, nextLevel };

    // Draw central hub circle
    const hubGraphics = this.add.graphics();
    hubGraphics.lineStyle(2 * PX, 0xffffff, 0.3);
    hubGraphics.strokeCircle(this.centerX, this.centerY, 60 * PX);
    hubGraphics.fillStyle(0x222222, 0.8);
    hubGraphics.fillCircle(this.centerX, this.centerY, 60 * PX);

    // Score display in hub
    const scoreText = this.add.text(this.centerX, this.centerY - 12 * PX, `Score`, {
      fontSize: `${16 * PX}px`,
      color: '#888888',
      fontFamily: "'Rajdhani', sans-serif",
      align: 'center',
    });
    scoreText.setOrigin(0.5);
    this.powerUpUIElements.push(scoreText);

    const scoreValue = this.add.text(
      this.centerX,
      this.centerY + 12 * PX,
      `${this.scoreManager.getScore()}`,
      {
        fontSize: `${24 * PX}px`,
        color: '#ffffff',
        fontFamily: "'Rajdhani', sans-serif",
        align: 'center',
      }
    );
    scoreValue.setOrigin(0.5);
    this.powerUpUIElements.push(scoreValue);
    this.powerUpUIElements.push(hubGraphics);

    // Render 3 power-up nodes arranged radially
    const nodeRadius = 260 * PX; // Distance from center to each node
    const startAngle = -Math.PI / 2; // Start at top

    selection.forEach((powerUp, index) => {
      const angle = startAngle + (index * (Math.PI * 2)) / 3;
      const nodeX = this.centerX + Math.cos(angle) * nodeRadius;
      const nodeY = this.centerY + Math.sin(angle) * nodeRadius;
      const rarityColor = RARITY_COLORS[powerUp.rarity];

      // Connection line from hub to node
      const lineGraphics = this.add.graphics();
      lineGraphics.lineStyle(2 * PX, rarityColor, 0.3);
      lineGraphics.beginPath();
      lineGraphics.moveTo(
        this.centerX + Math.cos(angle) * 60 * PX,
        this.centerY + Math.sin(angle) * 60 * PX
      );
      lineGraphics.lineTo(nodeX - Math.cos(angle) * 100 * PX, nodeY - Math.sin(angle) * 100 * PX);
      lineGraphics.strokePath();
      this.powerUpUIElements.push(lineGraphics);

      // Node background circle — dashed border for consumables
      const nodeBg = this.add.graphics();
      this.drawNodeBg(nodeBg, nodeX, nodeY, rarityColor, powerUp.consumable, false);
      this.powerUpUIElements.push(nodeBg);

      // Consumable tag or rarity label
      if (powerUp.consumable) {
        const tagText = this.add.text(nodeX, nodeY - 65 * PX, 'CONSUMABLE', {
          fontSize: `${13 * PX}px`,
          color: '#ffcc44',
          fontFamily: "'Rajdhani', sans-serif",
          align: 'center',
        });
        tagText.setOrigin(0.5);
        this.powerUpUIElements.push(tagText);
      } else {
        const rarityText = this.add.text(nodeX, nodeY - 65 * PX, powerUp.rarity, {
          fontSize: `${13 * PX}px`,
          color: '#' + rarityColor.toString(16).padStart(6, '0'),
          fontFamily: "'Rajdhani', sans-serif",
          align: 'center',
        });
        rarityText.setOrigin(0.5);
        this.powerUpUIElements.push(rarityText);
      }

      // Gamepad highlight border (drawn on top, only visible for selected card)
      const highlight = this.add.graphics();
      this.powerUpCardHighlights.push(highlight);
      this.powerUpUIElements.push(highlight);

      // Power-up name
      const nameText = this.add.text(nodeX, nodeY - 35 * PX, powerUp.name, {
        fontSize: `${22 * PX}px`,
        color: '#ffffff',
        fontFamily: "'Rajdhani', sans-serif",
        align: 'center',
      });
      nameText.setOrigin(0.5);
      this.powerUpUIElements.push(nameText);

      // Description
      const descText = this.add.text(nodeX, nodeY + 5 * PX, powerUp.description, {
        fontSize: `${14 * PX}px`,
        color: '#aaaaaa',
        fontFamily: "'Rajdhani', sans-serif",
        align: 'center',
        wordWrap: { width: 170 * PX },
      });
      descText.setOrigin(0.5);
      this.powerUpUIElements.push(descText);

      // Stack count or consumable quantity
      if (powerUp.consumable) {
        const qty = this.powerUpManager.getConsumableCount(powerUp.type);
        if (qty > 0) {
          const qtyText = this.add.text(nodeX, nodeY + 40 * PX, `Qty: ${qty}`, {
            fontSize: `${18 * PX}px`,
            color: '#ffcc44',
            fontFamily: "'Rajdhani', sans-serif",
            align: 'center',
          });
          qtyText.setOrigin(0.5);
          this.powerUpUIElements.push(qtyText);
        }
      } else {
        const stacks = this.powerUpManager.getStacks(powerUp.type);
        if (stacks > 0) {
          const stackText = this.add.text(nodeX, nodeY + 40 * PX, `x${stacks}`, {
            fontSize: `${18 * PX}px`,
            color: '#ffff00',
            fontFamily: "'Rajdhani', sans-serif",
            align: 'center',
          });
          stackText.setOrigin(0.5);
          this.powerUpUIElements.push(stackText);
        }
      }

      // Interactive hit area (invisible circle covering the node)
      const hitArea = this.add.circle(nodeX, nodeY, 100 * PX, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on('pointerover', () => {
        nodeBg.clear();
        this.drawNodeBg(nodeBg, nodeX, nodeY, rarityColor, powerUp.consumable, true);
      });
      hitArea.on('pointerout', () => {
        nodeBg.clear();
        this.drawNodeBg(nodeBg, nodeX, nodeY, rarityColor, powerUp.consumable, false);
      });
      hitArea.on('pointerdown', () => {
        this.selectPowerUp(powerUp, nextLevel);
      });
      this.powerUpUIElements.push(hitArea);
    });

    this.drawPowerUpHighlight();
  }

  private drawPowerUpHighlight() {
    const nodeRadius = 260 * PX;
    const startAngle = -Math.PI / 2;
    this.powerUpCardHighlights.forEach((highlight, index) => {
      highlight.clear();
      if (index === this.powerUpSelectedIndex) {
        const angle = startAngle + (index * (Math.PI * 2)) / 3;
        const nodeX = this.centerX + Math.cos(angle) * nodeRadius;
        const nodeY = this.centerY + Math.sin(angle) * nodeRadius;
        highlight.lineStyle(4 * PX, 0xffff00, 1);
        highlight.strokeCircle(nodeX, nodeY, 105 * PX);
      }
    });
  }

  private updatePowerUpGamepadNavigation() {
    const { selection, nextLevel } = this.powerUpSelectionData;
    if (!this.isPowerUpSelectionActive || selection.length === 0) return;

    const nav = this.gamepadManager.getHorizontalNavigation();
    if (nav !== 0) {
      this.powerUpSelectedIndex = Math.max(
        0,
        Math.min(selection.length - 1, this.powerUpSelectedIndex + nav)
      );
      this.drawPowerUpHighlight();
    }

    if (this.gamepadManager.isAJustPressed()) {
      this.selectPowerUp(selection[this.powerUpSelectedIndex], nextLevel);
    }
  }

  private drawNodeBg(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    isConsumable: boolean,
    isHover: boolean
  ) {
    const radius = (isHover ? 105 : 100) * PX;
    const fillColor = isHover ? 0x444444 : 0x333333;
    const fillAlpha = isHover ? 0.95 : 0.9;
    const lineWidth = (isHover ? 4 : 3) * PX;
    const lineAlpha = isHover ? 1 : 0.6;

    gfx.fillStyle(fillColor, fillAlpha);
    gfx.fillCircle(x, y, radius);

    if (isConsumable) {
      // Dashed-style border: draw small arcs around the circle
      const segments = 12;
      const gapRatio = 0.3;
      const segAngle = (Math.PI * 2) / segments;
      gfx.lineStyle(lineWidth, color, lineAlpha);
      for (let i = 0; i < segments; i++) {
        const start = i * segAngle;
        const end = start + segAngle * (1 - gapRatio);
        gfx.beginPath();
        gfx.arc(x, y, radius, start, end, false);
        gfx.strokePath();
      }
    } else {
      gfx.lineStyle(lineWidth, color, lineAlpha);
      gfx.strokeCircle(x, y, radius);
    }
  }

  private selectPowerUp(powerUp: PowerUpDefinition, nextLevel: number) {
    this.powerUpManager.addPowerUp(powerUp.type);

    // Terminal Shrink: tween terminal radius down
    if (powerUp.type === PowerUpType.TERMINAL_SHRINK) {
      const shrinkAmount = 0.04 * PLAYFIELD_RADIUS; // 36px
      const newTerminal = Math.max(this.terminalRadius - shrinkAmount, TERMINAL_RADIUS_INITIAL);
      this.tweens.add({
        targets: this,
        terminalRadius: newTerminal,
        duration: 300,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          this.drawPlayfield();
        },
      });
    }

    // Orbital Shield: shields will be spawned in updateShields on next frame

    // Destroy all power-up UI elements
    for (const el of this.powerUpUIElements) {
      el.destroy();
    }
    this.powerUpUIElements = [];
    this.powerUpCardHighlights = [];
    this.powerUpSelectionData = { selection: [], nextLevel: 0 };

    // Show equip screen if player has consumables, otherwise start next level
    if (this.powerUpManager.hasAnyConsumables()) {
      this.showEquipScreen(nextLevel);
    } else {
      this.isPowerUpSelectionActive = false;
      this.levelManager.startLevel(nextLevel);
    }
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

    this.isPowerUpSelectionActive = false;
    this.levelManager.startLevel(this.nextLevelForEquipScreen);
  }

  // ─── Game Over ────────────────────────────────────────────────────────

  private gameOver() {
    // Clean up shields
    for (const shield of this.shields) {
      shield.destroy();
    }
    this.shields = [];
    this.shieldRotation = 0;

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
