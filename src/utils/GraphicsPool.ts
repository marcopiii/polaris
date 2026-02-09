import Phaser from 'phaser';

let pool: Phaser.GameObjects.Graphics[] = [];
let activeScene: Phaser.Scene | null = null;

/** Call once in GameScene.create() to bind the pool to the current scene. */
export function initGraphicsPool(scene: Phaser.Scene) {
  activeScene = scene;
  pool = [];
}

/** Get a Graphics object from the pool, or create a new one. */
export function acquireGraphics(fallbackScene?: Phaser.Scene): Phaser.GameObjects.Graphics {
  if (activeScene && pool.length > 0) {
    const g = pool.pop()!;
    g.setVisible(true);
    g.setActive(true);
    return g;
  }
  const scene = activeScene ?? fallbackScene;
  return scene!.add.graphics();
}

/** Return a Graphics object to the pool instead of destroying it. */
export function releaseGraphics(g: Phaser.GameObjects.Graphics) {
  // Only pool if the pool is initialized (i.e. we're in GameScene)
  if (activeScene && g.scene === activeScene) {
    g.clear();
    g.setVisible(false);
    g.setActive(false);
    g.setPosition(0, 0);
    g.setRotation(0);
    g.setScale(1, 1);
    g.setAlpha(1);
    pool.push(g);
  } else {
    g.destroy();
  }
}
