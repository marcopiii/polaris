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
        duration: 300 + Math.random() * 200,
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

      const particle = {
        x,
        y,
        vx,
        vy,
        size: 2 + Math.random() * 7, // Variable particles (2-9px)
      };

      // Create separate graphics for each particle
      const particleGraphics = scene.add.graphics();

      scene.tweens.add({
        targets: particle,
        size: 0,
        duration: 500 + Math.random() * 300, // Longer duration (500-800ms)
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          particle.x += (particle.vx * 16) / 1000;
          particle.y += (particle.vy * 16) / 1000;
          particle.vx *= 0.96; // Less deceleration for longer travel
          particle.vy *= 0.96;

          particleGraphics.clear();
          particleGraphics.fillStyle(COLORS.terminalRadiusHint, 1.0);
          particleGraphics.fillCircle(particle.x, particle.y, particle.size);
        },
        onComplete: () => {
          particleGraphics.destroy();
        },
      });
    }
  }
}
