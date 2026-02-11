import { POINTS_PER_KILL, SCORE_MULTIPLIER, type Difficulty } from '../constants';

export default class ScoreManager {
  private score: number = 0;
  private kills: number = 0;
  private hitStreak: number = 0;
  private difficulty: Difficulty;

  constructor(difficulty: Difficulty) {
    this.difficulty = difficulty;
  }

  addKill(tier: number = 1) {
    this.kills++;
    const raw = POINTS_PER_KILL * tier + this.hitStreak;
    this.score += Math.round(raw * SCORE_MULTIPLIER[this.difficulty]);
  }

  incrementHitStreak() {
    this.hitStreak++;
  }

  resetHitStreak() {
    this.hitStreak = 0;
  }

  getHitStreak(): number {
    return this.hitStreak;
  }

  getScore(): number {
    return this.score;
  }

  getKills(): number {
    return this.kills;
  }

  reset() {
    this.score = 0;
    this.kills = 0;
    this.hitStreak = 0;
  }
}
