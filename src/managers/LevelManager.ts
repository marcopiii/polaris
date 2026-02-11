import {
  LEVEL_BASE_DURATION,
  LEVEL_DURATION_INCREMENT,
  SPAWN_RATE_INITIAL,
  SPAWN_RATE_ACCELERATION,
  SPAWN_RATE_LEVEL_INCREMENT,
  type Difficulty,
} from '../constants';

export default class LevelManager {
  private currentLevel: number = 1;
  private levelDuration: number = 0;
  private levelTimer: number = 0;
  private timeSinceLastSpawn: number = 0;
  private enemiesSpawnedThisLevel: number = 0;
  private isLevelActive: boolean = false;
  private difficulty: Difficulty;

  constructor(difficulty: Difficulty) {
    this.difficulty = difficulty;
  }

  startLevel(levelNumber: number = 1) {
    this.currentLevel = levelNumber;
    this.levelDuration = LEVEL_BASE_DURATION + LEVEL_DURATION_INCREMENT * (levelNumber - 1);
    this.levelTimer = 0;
    this.timeSinceLastSpawn = 0;
    this.enemiesSpawnedThisLevel = 0;
    this.isLevelActive = true;
  }

  update(delta: number): boolean {
    if (!this.isLevelActive) {
      return false;
    }

    const deltaSec = delta / 1000;
    this.levelTimer += deltaSec;
    this.timeSinceLastSpawn += deltaSec;

    // Check if it's time to spawn an enemy
    const currentRate = this.getCurrentSpawnRate();
    const spawnInterval = 1 / currentRate;

    if (this.timeSinceLastSpawn >= spawnInterval && this.levelTimer < this.levelDuration) {
      this.timeSinceLastSpawn = 0;
      this.enemiesSpawnedThisLevel++;
      return true; // Signal to spawn an enemy
    }

    return false;
  }

  getCurrentSpawnRate(): number {
    return (
      SPAWN_RATE_INITIAL[this.difficulty] +
      SPAWN_RATE_LEVEL_INCREMENT[this.difficulty] * (this.currentLevel - 1) +
      SPAWN_RATE_ACCELERATION[this.difficulty] * this.levelTimer
    );
  }

  isLevelComplete(aliveEnemies: number): boolean {
    return this.levelTimer >= this.levelDuration && aliveEnemies === 0;
  }

  completeLevel() {
    this.isLevelActive = false;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getLevelProgress(): number {
    return Math.min(this.levelTimer / this.levelDuration, 1);
  }
}
