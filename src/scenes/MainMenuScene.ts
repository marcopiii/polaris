import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  COLORS,
  PLAYFIELD_RADIUS,
  PLAYER_SIZE,
  TERMINAL_RADIUS_INITIAL,
  PX,
} from '../constants';
import { ParticleEffects } from '../utils/ParticleEffects';
import { AudioGenerator } from '../utils/AudioGenerator';
import logoHtml from './logo.html?raw';

export default class MainMenuScene extends Phaser.Scene {
  private logoDom!: Phaser.GameObjects.DOMElement;
  private buttonDom!: Phaser.GameObjects.DOMElement;
  private leaderboardDom!: Phaser.GameObjects.DOMElement;
  private enemyCircle?: Phaser.GameObjects.Graphics;
  private enemyPos = { x: 0, y: 0 };
  private isAnimating = false;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    this.isAnimating = false;

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.createLogo(centerX, centerY);
    this.createStartButton(centerX, centerY + 280 * PX);
    this.createLeaderboardButton(centerX, centerY + 400 * PX);
  }

  private createLogo(x: number, y: number) {
    const el = document.createElement('div');
    el.innerHTML = logoHtml;

    this.logoDom = this.add.dom(x, y, el);
    this.logoDom.setScale(PX * 1.4);
  }

  private createStartButton(x: number, y: number) {
    const button = document.createElement('button');
    button.textContent = 'START GAME';
    Object.assign(button.style, {
      fontFamily: "'Rajdhani', sans-serif",
      fontWeight: '300',
      fontSize: '32px',
      color: '#ffffff',
      background: '#444444',
      border: 'none',
      padding: '10px 20px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      transition: 'none',
    });

    button.addEventListener('mouseenter', () => {
      if (!this.isAnimating) {
        button.style.background = '#666666';
      }
    });
    button.addEventListener('mouseleave', () => {
      if (!this.isAnimating) {
        button.style.background = '#444444';
      }
    });
    button.addEventListener('click', () => {
      this.playStartAnimation();
    });

    this.buttonDom = this.add.dom(x, y, button);
    this.buttonDom.setScale(PX * 1.4);
  }

  private createLeaderboardButton(x: number, y: number) {
    const button = document.createElement('button');
    button.textContent = 'LEADERBOARD';
    Object.assign(button.style, {
      fontFamily: "'Rajdhani', sans-serif",
      fontWeight: '300',
      fontSize: '32px',
      color: '#ffffff',
      background: '#444444',
      border: 'none',
      padding: '10px 20px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      transition: 'none',
    });

    button.addEventListener('mouseenter', () => {
      if (!this.isAnimating) {
        button.style.background = '#666666';
      }
    });
    button.addEventListener('mouseleave', () => {
      if (!this.isAnimating) {
        button.style.background = '#444444';
      }
    });
    button.addEventListener('click', () => {
      if (!this.isAnimating) {
        this.scene.start('LeaderboardScene');
      }
    });

    this.leaderboardDom = this.add.dom(x, y, button);
    this.leaderboardDom.setScale(PX * 1.4);
  }

  private getOPositionInGameWorld(): { x: number; y: number } {
    const polarisEl = this.logoDom.node.querySelector(
      '[data-logo-part="polaris"]'
    ) as HTMLElement | null;
    if (!polarisEl) {
      return { x: this.logoDom.x, y: this.logoDom.y };
    }

    const logoContainer = this.logoDom.node as HTMLElement;
    const containerRect = logoContainer.getBoundingClientRect();
    const polarisRect = polarisEl.getBoundingClientRect();

    // Offset of polaris center from logo container center in viewport pixels
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    const polarisCenterX = polarisRect.left + polarisRect.width / 2;
    const polarisCenterY = polarisRect.top + polarisRect.height / 2;

    const offsetVpX = polarisCenterX - containerCenterX;
    const offsetVpY = polarisCenterY - containerCenterY;

    // Convert viewport pixels to game-world pixels
    const canvas = this.sys.game.canvas;
    const scaleX = GAME_WIDTH / canvas.clientWidth;
    const scaleY = GAME_HEIGHT / canvas.clientHeight;

    return {
      x: this.logoDom.x + offsetVpX * scaleX,
      y: this.logoDom.y + offsetVpY * scaleY,
    };
  }

  private playStartAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    this.animatePhase1(() => {
      this.animatePhase2(() => {
        this.animatePhase3();
      });
    });
  }

  private animatePhase1(onComplete: () => void) {
    const logoNode = this.logoDom.node as HTMLElement;
    const pSpan = logoNode.querySelector('[data-logo-part="p"]') as HTMLElement | null;
    const larisSpan = logoNode.querySelector('[data-logo-part="laris"]') as HTMLElement | null;

    const button = this.buttonDom.node as HTMLButtonElement;

    // Measure button size before hiding, then hide the DOM element entirely
    const buttonRect = button.getBoundingClientRect();
    button.style.pointerEvents = 'none';
    button.style.visibility = 'hidden';

    // Hide leaderboard button during animation
    const lbButton = this.leaderboardDom.node as HTMLElement;
    lbButton.style.pointerEvents = 'none';
    lbButton.style.visibility = 'hidden';

    const canvasScale = GAME_WIDTH / this.sys.game.canvas.clientWidth;

    // Measure P/LARIS inner-edge distances from the O center in unscaled local CSS pixels.
    // getBoundingClientRect returns viewport pixels (includes parent scale), so divide out
    // the logo scale so the push translateX works in the parent's local coordinate space.
    const logoScale = PX * 1.4;
    const polarisEl = logoNode.querySelector('[data-logo-part="polaris"]') as HTMLElement | null;
    let pDist = 0;
    let larisDist = 0;
    if (polarisEl) {
      const polarisCx =
        polarisEl.getBoundingClientRect().left + polarisEl.getBoundingClientRect().width / 2;
      if (pSpan) {
        pDist = (polarisCx - pSpan.getBoundingClientRect().right) / logoScale;
      }
      if (larisSpan) {
        larisDist = (larisSpan.getBoundingClientRect().left - polarisCx) / logoScale;
      }
    }

    // Move the "O" to screen center by tweening the logo DOM element
    const oPos = this.getOPositionInGameWorld();
    const oOffsetX = oPos.x - this.logoDom.x;
    const oOffsetY = oPos.y - this.logoDom.y;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.tweens.add({
      targets: this.logoDom,
      x: centerX - oOffsetX,
      y: centerY - oOffsetY,
      duration: 350,
      ease: 'Quad.easeInOut',
    });

    // Expanding playfield circle centered on the "O", follows its movement
    // Also pushes P left and LARIS right so they stay outside the circle edge
    const playfieldCircle = this.add.graphics();
    const ring = { radius: 0 };

    this.tweens.add({
      targets: ring,
      radius: PLAYFIELD_RADIUS,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const currentO = this.getOPositionInGameWorld();
        playfieldCircle.clear();
        playfieldCircle.fillStyle(COLORS.playfield, 1);
        playfieldCircle.fillCircle(currentO.x, currentO.y, ring.radius);

        // Push letters outward to stay outside the circle
        const radiusCss = ring.radius / canvasScale;
        if (pSpan) {
          const push = Math.max(0, radiusCss - pDist);
          pSpan.style.transform = `translateX(${-push}px)`;
          pSpan.style.opacity = String(Math.max(0, 1 - push / 300));
        }
        if (larisSpan) {
          const push = Math.max(0, radiusCss - larisDist);
          larisSpan.style.transform = `translateX(${push}px)`;
          larisSpan.style.opacity = String(Math.max(0, 1 - push / 300));
        }
      },
    });

    // Morph button into enemy circle and move it toward center
    this.enemyPos = { x: this.buttonDom.x, y: this.buttonDom.y };
    const startW = buttonRect.width * canvasScale;
    const startH = buttonRect.height * canvasScale;
    const endSize = 32 * PX;

    this.enemyCircle = this.add.graphics();
    const morph = { w: startW, h: startH, cornerR: 4 * PX };

    // Draw initial rect immediately (matches the button appearance without text)
    this.enemyCircle.fillStyle(0x444444, 1);
    this.enemyCircle.fillRoundedRect(
      this.enemyPos.x - startW / 2,
      this.enemyPos.y - startH / 2,
      startW,
      startH,
      4 * PX
    );

    // Move enemy circle toward center
    this.tweens.add({
      targets: this.enemyPos,
      x: centerX,
      y: centerY + 150 * PX,
      duration: 900,
      ease: 'Quad.easeInOut',
    });

    this.time.delayedCall(50, () => {
      this.tweens.add({
        targets: morph,
        w: endSize,
        h: endSize,
        cornerR: endSize / 2,
        duration: 200,
        ease: 'Quad.easeInOut',
        onUpdate: () => {
          this.enemyCircle!.clear();
          this.enemyCircle!.fillStyle(0x333333, 1);
          this.enemyCircle!.fillRoundedRect(
            this.enemyPos.x - morph.w / 2,
            this.enemyPos.y - morph.h / 2,
            morph.w,
            morph.h,
            morph.cornerR
          );
        },
      });
    });

    // Keep redrawing at current position after morph completes
    const posTracker = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.enemyCircle) {
          posTracker.destroy();
          return;
        }
        this.enemyCircle.clear();
        this.enemyCircle.fillStyle(0x333333, 1);
        this.enemyCircle.fillRoundedRect(
          this.enemyPos.x - morph.w / 2,
          this.enemyPos.y - morph.h / 2,
          morph.w,
          morph.h,
          morph.cornerR
        );
      },
    });

    this.time.delayedCall(300, onComplete);
  }

  private animatePhase2(onComplete: () => void) {
    // O is at screen center after Phase 1
    const oPos = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
    const btnPos = { x: this.enemyPos.x, y: this.enemyPos.y };

    const angle = Math.atan2(btnPos.y - oPos.y, btnPos.x - oPos.x);

    const audio = new AudioGenerator();
    audio.playShoot();

    const bulletGraphics = this.add.graphics();
    const bullet = { x: oPos.x, y: oPos.y };

    this.tweens.add({
      targets: bullet,
      x: btnPos.x,
      y: btnPos.y,
      duration: 200,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        bulletGraphics.clear();
        bulletGraphics.save();
        bulletGraphics.translateCanvas(bullet.x, bullet.y);
        bulletGraphics.rotateCanvas(angle);

        // Outer glow
        bulletGraphics.fillStyle(COLORS.bullet, 0.15);
        bulletGraphics.fillEllipse(0, 0, BULLET_WIDTH * 2, BULLET_HEIGHT * 3);

        // Inner glow
        bulletGraphics.fillStyle(COLORS.bullet, 0.4);
        bulletGraphics.fillEllipse(0, 0, BULLET_WIDTH * 1.3, BULLET_HEIGHT * 1.8);

        // Core
        bulletGraphics.fillStyle(COLORS.bullet, 1.0);
        bulletGraphics.fillEllipse(0, 0, BULLET_WIDTH, BULLET_HEIGHT);

        bulletGraphics.restore();
      },
      onComplete: () => {
        bulletGraphics.destroy();
        onComplete();
      },
    });
  }

  private animatePhase3() {
    const btnPos = { x: this.enemyPos.x, y: this.enemyPos.y };

    // Destroy enemy circle graphic
    this.enemyCircle?.destroy();

    // Play hit sound and spawn particles
    const audio = new AudioGenerator();
    audio.playHit();

    ParticleEffects.createEnemyDeathParticles(this, btnPos.x, btnPos.y);
    ParticleEffects.createBulletHitParticles(this, btnPos.x, btnPos.y);

    // Squeeze the "O" — hide DOM and replace with Phaser Graphics
    const center = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
    const logoNode = this.logoDom.node as HTMLElement;
    const polarisEl = logoNode.querySelector('[data-logo-part="polaris"]') as HTMLElement | null;

    const canvasScale = GAME_WIDTH / this.sys.game.canvas.clientWidth;
    let startRingR = 84 * canvasScale;
    let startCoreR = 32 * canvasScale;
    if (polarisEl) {
      const polarisRect = polarisEl.getBoundingClientRect();
      startRingR = (polarisRect.width / 2) * canvasScale;
      startCoreR = startRingR * (64 / 168);
      polarisEl.style.visibility = 'hidden';
    }

    const squeezeGfx = this.add.graphics();
    const squeeze = { ringR: startRingR, coreR: startCoreR, lineW: 4 * PX };

    this.tweens.add({
      targets: squeeze,
      ringR: TERMINAL_RADIUS_INITIAL,
      coreR: PLAYER_SIZE,
      lineW: 2 * PX,
      duration: 400,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        squeezeGfx.clear();
        // Ring
        squeezeGfx.lineStyle(squeeze.lineW, COLORS.player, 1);
        squeezeGfx.strokeCircle(center.x, center.y, squeeze.ringR);
        // Core
        squeezeGfx.fillStyle(COLORS.player, 1);
        squeezeGfx.fillCircle(center.x, center.y, squeeze.coreR);
      },
      onComplete: () => {
        squeezeGfx.destroy();
        this.scene.start('GameScene');
      },
    });
  }
}
