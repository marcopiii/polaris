import Phaser from 'phaser';
import { ENEMY_SIZE, PLAYFIELD_RADIUS, COLORS, PX } from '../constants';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  damping: number;
  duration: number;
  elapsed: number;
}

interface SplinterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  rotation: number;
  damping: number;
  duration: number;
  elapsed: number;
}

function updateAndDrawCircleParticles(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  particles: Particle[],
  color: number
) {
  let alive = false;
  graphics.clear();

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.elapsed += 16;
    if (p.elapsed >= p.duration) {
      particles.splice(i, 1);
      continue;
    }
    alive = true;

    p.x += (p.vx * 16) / 1000;
    p.y += (p.vy * 16) / 1000;
    p.vx *= p.damping;
    p.vy *= p.damping;

    const t = p.elapsed / p.duration;
    const currentSize = p.size * (1 - t * t * t); // cubic ease in

    graphics.fillStyle(color, 1.0);
    graphics.fillCircle(p.x, p.y, currentSize);
  }

  if (!alive) {
    graphics.destroy();
  } else {
    scene.time.delayedCall(16, () =>
      updateAndDrawCircleParticles(scene, graphics, particles, color)
    );
  }
}

export class ParticleEffects {
  static createEnemyDeathParticles(scene: Phaser.Scene, x: number, y: number) {
    const particles: Particle[] = [];
    const particleCount = 3 + Math.floor(Math.random() * 6);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (100 + Math.random() * 50) * PX;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (ENEMY_SIZE * 0.5),
        damping: 0.95,
        duration: 600 + Math.random() * 400,
        elapsed: 0,
      });
    }

    const graphics = scene.add.graphics();
    updateAndDrawCircleParticles(scene, graphics, particles, COLORS.enemy);
  }

  static createEnemyHitParticles(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bulletX: number,
    bulletY: number
  ) {
    const particles: Particle[] = [];
    const particleCount = 2 + Math.floor(Math.random() * 3);
    const impactAngle = Math.atan2(y - bulletY, x - bulletX);

    for (let i = 0; i < particleCount; i++) {
      const angle = impactAngle + (Math.random() - 0.5) * (Math.PI / 2);
      const speed = (60 + Math.random() * 40) * PX;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (ENEMY_SIZE * 0.3),
        damping: 0.92,
        duration: 300 + Math.random() * 200,
        elapsed: 0,
      });
    }

    const graphics = scene.add.graphics();
    updateAndDrawCircleParticles(scene, graphics, particles, COLORS.enemy);
  }

  static createBulletHitParticles(scene: Phaser.Scene, x: number, y: number) {
    const particles: Particle[] = [];
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = (80 + Math.random() * 40) * PX;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 * PX,
        damping: 0.9,
        duration: 200 + Math.random() * 100,
        elapsed: 0,
      });
    }

    const graphics = scene.add.graphics();
    updateAndDrawCircleParticles(scene, graphics, particles, 0xffffff);
  }

  static createTerminalGrowEffect(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    terminalRadius: number
  ) {
    const graphics = scene.add.graphics();
    const tweenTarget = { radius: terminalRadius, alpha: 1 };

    scene.tweens.add({
      targets: tweenTarget,
      radius: PLAYFIELD_RADIUS,
      alpha: 0,
      duration: 500,
      onUpdate: () => {
        graphics.clear();
        graphics.lineStyle(3 * PX, 0xff4444, tweenTarget.alpha);
        graphics.strokeCircle(centerX, centerY, tweenTarget.radius);
      },
      onComplete: () => {
        graphics.destroy();
      },
    });
  }

  static createLevelCompleteWave(scene: Phaser.Scene, centerX: number, centerY: number) {
    const graphics = scene.add.graphics();
    const tweenTarget = { radius: 0, alpha: 1 };

    scene.tweens.add({
      targets: tweenTarget,
      radius: PLAYFIELD_RADIUS,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        graphics.clear();
        graphics.lineStyle(4 * PX, 0xffffff, tweenTarget.alpha);
        graphics.strokeCircle(centerX, centerY, tweenTarget.radius);
      },
      onComplete: () => {
        graphics.destroy();
      },
    });
  }

  static createShockwaveEffect(scene: Phaser.Scene, centerX: number, centerY: number) {
    for (const ring of [
      { color: 0xffaa00, width: 6 * PX, delay: 0 },
      { color: 0xff4400, width: 3 * PX, delay: 80 },
    ]) {
      const graphics = scene.add.graphics();
      const tweenTarget = { radius: 0, alpha: 1 };

      scene.tweens.add({
        targets: tweenTarget,
        radius: PLAYFIELD_RADIUS,
        alpha: 0,
        duration: 600,
        delay: ring.delay,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          graphics.clear();
          graphics.lineStyle(ring.width, ring.color, tweenTarget.alpha);
          graphics.strokeCircle(centerX, centerY, tweenTarget.radius);
        },
        onComplete: () => {
          graphics.destroy();
        },
      });
    }
  }

  static createChainLightningEffect(
    scene: Phaser.Scene,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) {
    const graphics = scene.add.graphics();
    const tweenTarget = { alpha: 1 };

    const dx = toX - fromX;
    const dy = toY - fromY;
    const segments = 6;

    scene.tweens.add({
      targets: tweenTarget,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        graphics.clear();
        graphics.lineStyle(3 * PX, 0xffffff, tweenTarget.alpha);
        graphics.beginPath();
        graphics.moveTo(fromX, fromY);

        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const px = fromX + dx * t + (Math.random() - 0.5) * 20 * PX;
          const py = fromY + dy * t + (Math.random() - 0.5) * 20 * PX;
          graphics.lineTo(px, py);
        }

        graphics.lineTo(toX, toY);
        graphics.strokePath();

        // Glow layer
        graphics.lineStyle(6 * PX, 0xcccccc, tweenTarget.alpha * 0.3);
        graphics.beginPath();
        graphics.moveTo(fromX, fromY);
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const px = fromX + dx * t + (Math.random() - 0.5) * 20 * PX;
          const py = fromY + dy * t + (Math.random() - 0.5) * 20 * PX;
          graphics.lineTo(px, py);
        }
        graphics.lineTo(toX, toY);
        graphics.strokePath();
      },
      onComplete: () => {
        graphics.destroy();
      },
    });
  }

  static createShieldHitParticles(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    shieldAngle: number,
    arcAngle: number,
    radius: number
  ) {
    const particles: Particle[] = [];
    const particleCount = 6;
    const halfArc = arcAngle / 2;

    for (let i = 0; i < particleCount; i++) {
      const a = shieldAngle + (Math.random() - 0.5) * halfArc;
      const px = centerX + Math.cos(a) * radius;
      const py = centerY + Math.sin(a) * radius;
      const outAngle = a + (Math.random() - 0.5) * 0.5;
      const speed = (80 + Math.random() * 60) * PX;

      particles.push({
        x: px,
        y: py,
        vx: Math.cos(outAngle) * speed,
        vy: Math.sin(outAngle) * speed,
        size: (2 + Math.random() * 2) * PX,
        damping: 0.92,
        duration: 250 + Math.random() * 150,
        elapsed: 0,
      });
    }

    const graphics = scene.add.graphics();
    updateAndDrawCircleParticles(scene, graphics, particles, 0xffffff);
  }

  static createShieldDestroyParticles(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    shieldAngle: number,
    arcAngle: number,
    radius: number
  ) {
    const particles: Particle[] = [];
    const particleCount = 18;
    const halfArc = arcAngle / 2;

    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1);
      const a = shieldAngle - halfArc + t * arcAngle;
      const px = centerX + Math.cos(a) * radius;
      const py = centerY + Math.sin(a) * radius;
      const outAngle = a + (Math.random() - 0.5) * 0.8;
      const speed = (100 + Math.random() * 80) * PX;

      particles.push({
        x: px,
        y: py,
        vx: Math.cos(outAngle) * speed,
        vy: Math.sin(outAngle) * speed,
        size: (3 + Math.random() * 3) * PX,
        damping: 0.94,
        duration: 400 + Math.random() * 300,
        elapsed: 0,
      });
    }

    const graphics = scene.add.graphics();
    updateAndDrawCircleParticles(scene, graphics, particles, 0xffffff);

    // Flash arc that fades out
    const flashGraphics = scene.add.graphics();
    const flash = { alpha: 1 };
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        flashGraphics.clear();
        flashGraphics.lineStyle(20 * PX, 0xffffff, flash.alpha * 0.5);
        flashGraphics.beginPath();
        flashGraphics.arc(
          centerX,
          centerY,
          radius,
          shieldAngle - halfArc,
          shieldAngle + halfArc,
          false
        );
        flashGraphics.strokePath();
      },
      onComplete: () => {
        flashGraphics.destroy();
      },
    });
  }

  static createTerminalHitParticles(
    scene: Phaser.Scene,
    x: number,
    y: number,
    centerX: number,
    centerY: number
  ) {
    const particles: SplinterParticle[] = [];
    const particleCount = 5 + Math.floor(Math.random() * 4);
    const baseAngle = Math.atan2(y - centerY, x - centerX);

    for (let i = 0; i < particleCount; i++) {
      const spread = (Math.random() - 0.5) * (Math.PI / 1.5);
      const angle = baseAngle + spread;
      const speed = (80 + Math.random() * 40) * PX;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      particles.push({
        x,
        y,
        vx,
        vy,
        length: (6 + Math.random() * 10) * PX,
        width: (1 + Math.random() * 2) * PX,
        rotation: Math.atan2(vy, vx),
        damping: 0.96,
        duration: 500 + Math.random() * 300,
        elapsed: 0,
      });
    }

    const graphics = scene.add.graphics();
    updateAndDrawSplinterParticles(scene, graphics, particles);
  }
}

function updateAndDrawSplinterParticles(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  particles: SplinterParticle[]
) {
  let alive = false;
  graphics.clear();

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.elapsed += 16;
    if (p.elapsed >= p.duration) {
      particles.splice(i, 1);
      continue;
    }
    alive = true;

    p.x += (p.vx * 16) / 1000;
    p.y += (p.vy * 16) / 1000;
    p.vx *= p.damping;
    p.vy *= p.damping;

    const t = p.elapsed / p.duration;
    const scale = 1 - t * t * t;
    const halfLen = (p.length * scale) / 2;
    const halfWid = (p.width * scale) / 2;
    const cos = Math.cos(p.rotation);
    const sin = Math.sin(p.rotation);

    graphics.fillStyle(COLORS.terminalRadiusHint, 1.0);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(
          p.x - halfLen * cos + halfWid * sin,
          p.y - halfLen * sin - halfWid * cos
        ),
        new Phaser.Geom.Point(
          p.x + halfLen * cos + halfWid * sin,
          p.y + halfLen * sin - halfWid * cos
        ),
        new Phaser.Geom.Point(
          p.x + halfLen * cos - halfWid * sin,
          p.y + halfLen * sin + halfWid * cos
        ),
        new Phaser.Geom.Point(
          p.x - halfLen * cos - halfWid * sin,
          p.y - halfLen * sin + halfWid * cos
        ),
      ],
      true
    );
  }

  if (!alive) {
    graphics.destroy();
  } else {
    scene.time.delayedCall(16, () => updateAndDrawSplinterParticles(scene, graphics, particles));
  }
}
