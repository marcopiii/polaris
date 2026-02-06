import { POINTS_PER_KILL } from '../constants';

export default class ScoreManager {
  private score: number = 0;
  private kills: number = 0;

  addKill() {
    this.kills++;
    this.score += POINTS_PER_KILL;
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
  }
}
