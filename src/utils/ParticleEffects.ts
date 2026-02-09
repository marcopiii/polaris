import Phaser from 'phaser';
import { ENEMY_SIZE, PLAYFIELD_RADIUS, COLORS } from '../constants';

export class ParticleEffects {
  static createEnemyDeathParticles(scene: Phaser.Scene, x: number, y: number) {
    const particleCount = 3 + Math.floor(Math.random() * 6); // Random 3-8 particles

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2; // Completely random angle
      const speed = 100 + Math.random() * 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const particle = {
        x,
        y,
        vx,
        vy,
        size: Math.random() * (ENEMY_SIZE * 0.5), // Random size up to 50% of enemy size
      };

      // Create separate graphics for each particle
      const particleGraphics = scene.add.graphics();

      scene.tweens.add({
        targets: particle,
        size: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          particle.x += (particle.vx * 16) / 1000;
          particle.y += (particle.vy * 16) / 1000;
          particle.vx *= 0.95;
          particle.vy *= 0.95;

          particleGraphics.clear();
          particleGraphics.fillStyle(0x000000, 1.0);
          particleGraphics.fillCircle(particle.x, particle.y, particle.size);
        },
        onComplete: () => {
          particleGraphics.destroy();
        },
      });
    }
  }

  static createBulletHitParticles(scene: Phaser.Scene, x: number, y: number) {
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 80 + Math.random() * 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const particle = {
        x,
        y,
        vx,
        vy,
        size: 2,
      };

      // Create separate graphics for each particle
      const particleGraphics = scene.add.graphics();

      scene.tweens.add({
        targets: particle,
        size: 0,
        duration: 200 + Math.random() * 100,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          particle.x += (particle.vx * 16) / 1000;
          particle.y += (particle.vy * 16) / 1000;
          particle.vx *= 0.9;
          particle.vy *= 0.9;

          particleGraphics.clear();
          particleGraphics.fillStyle(0xffffff, 1.0);
          particleGraphics.fillCircle(particle.x, particle.y, particle.size);
        },
        onComplete: () => {
          particleGraphics.destroy();
        },
      });
    }
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
        graphics.lineStyle(3, 0xff4444, tweenTarget.alpha);
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
        graphics.lineStyle(4, 0xffffff, tweenTarget.alpha);
        graphics.strokeCircle(centerX, centerY, tweenTarget.radius);
      },
      onComplete: () => {
        graphics.destroy();
      },
    });
  }

  static createShockwaveEffect(scene: Phaser.Scene, centerX: number, centerY: number) {
    // Two expanding rings: bright inner + faint outer
    for (const ring of [
      { color: 0xffaa00, width: 6, delay: 0 },
      { color: 0xff4400, width: 3, delay: 80 },
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

    // Draw a jagged lightning bolt between two points
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
        graphics.lineStyle(3, 0xffffff, tweenTarget.alpha);
        graphics.beginPath();
        graphics.moveTo(fromX, fromY);

        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const px = fromX + dx * t + (Math.random() - 0.5) * 20;
          const py = fromY + dy * t + (Math.random() - 0.5) * 20;
          graphics.lineTo(px, py);
        }

        graphics.lineTo(toX, toY);
        graphics.strokePath();

        // Glow layer
        graphics.lineStyle(6, 0xcccccc, tweenTarget.alpha * 0.3);
        graphics.beginPath();
        graphics.moveTo(fromX, fromY);
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const px = fromX + dx * t + (Math.random() - 0.5) * 20;
          const py = fromY + dy * t + (Math.random() - 0.5) * 20;
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
    const particleCount = 6;
    const halfArc = arcAngle / 2;

    for (let i = 0; i < particleCount; i++) {
      // Scatter particles along the arc
      const a = shieldAngle + (Math.random() - 0.5) * halfArc;
      const px = centerX + Math.cos(a) * radius;
      const py = centerY + Math.sin(a) * radius;
      // Fly outward from center
      const outAngle = a + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 60;

      const particle = {
        x: px,
        y: py,
        vx: Math.cos(outAngle) * speed,
        vy: Math.sin(outAngle) * speed,
        size: 2 + Math.random() * 2,
      };

      const particleGraphics = scene.add.graphics();

      scene.tweens.add({
        targets: particle,
        size: 0,
        duration: 250 + Math.random() * 150,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          particle.x += (particle.vx * 16) / 1000;
          particle.y += (particle.vy * 16) / 1000;
          particle.vx *= 0.92;
          particle.vy *= 0.92;

          particleGraphics.clear();
          particleGraphics.fillStyle(0xffffff, 1.0);
          particleGraphics.fillCircle(particle.x, particle.y, particle.size);
        },
        onComplete: () => {
          particleGraphics.destroy();
        },
      });
    }
  }

  static createShieldDestroyParticles(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    shieldAngle: number,
    arcAngle: number,
    radius: number
  ) {
    const particleCount = 18;
    const halfArc = arcAngle / 2;

    for (let i = 0; i < particleCount; i++) {
      // Distribute evenly along the full arc
      const t = i / (particleCount - 1);
      const a = shieldAngle - halfArc + t * arcAngle;
      const px = centerX + Math.cos(a) * radius;
      const py = centerY + Math.sin(a) * radius;
      // Fly outward with some spread
      const outAngle = a + (Math.random() - 0.5) * 0.8;
      const speed = 100 + Math.random() * 80;

      const particle = {
        x: px,
        y: py,
        vx: Math.cos(outAngle) * speed,
        vy: Math.sin(outAngle) * speed,
        size: 3 + Math.random() * 3,
      };

      const particleGraphics = scene.add.graphics();

      scene.tweens.add({
        targets: particle,
        size: 0,
        duration: 400 + Math.random() * 300,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          particle.x += (particle.vx * 16) / 1000;
          particle.y += (particle.vy * 16) / 1000;
          particle.vx *= 0.94;
          particle.vy *= 0.94;

          particleGraphics.clear();
          particleGraphics.fillStyle(0xffffff, 1.0);
          particleGraphics.fillCircle(particle.x, particle.y, particle.size);
        },
        onComplete: () => {
          particleGraphics.destroy();
        },
      });
    }

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
        flashGraphics.lineStyle(20, 0xffffff, flash.alpha * 0.5);
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
    const particleCount = 5 + Math.floor(Math.random() * 4); // Random 5-8 particles

    // Calculate outward direction from center
    const baseAngle = Math.atan2(y - centerY, x - centerX);

    for (let i = 0; i < particleCount; i++) {
      // Spray particles outward in a wide cone (±60 degrees)
      const spread = (Math.random() - 0.5) * (Math.PI / 1.5);
      const angle = baseAngle + spread;
      const speed = 80 + Math.random() * 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const length = 6 + Math.random() * 10; // Splinter length (6-16px)
      const width = 1 + Math.random() * 2; // Splinter width (1-3px)
      const rotation = Math.atan2(vy, vx); // Orient along movement direction

      const particle = {
        x,
        y,
        vx,
        vy,
        length,
        width,
        scale: 1,
      };

      // Create separate graphics for each particle
      const particleGraphics = scene.add.graphics();

      scene.tweens.add({
        targets: particle,
        scale: 0,
        duration: 500 + Math.random() * 300, // Longer duration (500-800ms)
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          particle.x += (particle.vx * 16) / 1000;
          particle.y += (particle.vy * 16) / 1000;
          particle.vx *= 0.96; // Less deceleration for longer travel
          particle.vy *= 0.96;

          const halfLen = (particle.length * particle.scale) / 2;
          const halfWid = (particle.width * particle.scale) / 2;
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);

          particleGraphics.clear();
          particleGraphics.fillStyle(COLORS.terminalRadiusHint, 1.0);
          particleGraphics.fillPoints(
            [
              new Phaser.Geom.Point(
                particle.x - halfLen * cos + halfWid * sin,
                particle.y - halfLen * sin - halfWid * cos
              ),
              new Phaser.Geom.Point(
                particle.x + halfLen * cos + halfWid * sin,
                particle.y + halfLen * sin - halfWid * cos
              ),
              new Phaser.Geom.Point(
                particle.x + halfLen * cos - halfWid * sin,
                particle.y + halfLen * sin + halfWid * cos
              ),
              new Phaser.Geom.Point(
                particle.x - halfLen * cos - halfWid * sin,
                particle.y - halfLen * sin + halfWid * cos
              ),
            ],
            true
          );
        },
        onComplete: () => {
          particleGraphics.destroy();
        },
      });
    }
  }
}
