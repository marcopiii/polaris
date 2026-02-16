import type { LeaderboardEntry } from '../types';

const LEADERBOARD_KEY = 'polaris_leaderboard';
const MAX_ENTRIES = 10;

export default class LeaderboardManager {
  addScore(name: string, score: number, level: number = 1) {
    const entries = this.getTopScores(MAX_ENTRIES);
    const newEntry: LeaderboardEntry = {
      name,
      score,
      level,
      date: Date.now(),
    };

    entries.push(newEntry);
    entries.sort((a, b) => b.score - a.score);
    entries.splice(MAX_ENTRIES);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  }

  getTopScores(limit: number = MAX_ENTRIES): LeaderboardEntry[] {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    if (!stored) {
      return [];
    }

    try {
      const entries: LeaderboardEntry[] = JSON.parse(stored);
      return entries.slice(0, limit);
    } catch {
      return [];
    }
  }

  isHighScore(score: number): boolean {
    const entries = this.getTopScores(MAX_ENTRIES);
    if (entries.length < MAX_ENTRIES) {
      return true;
    }
    return score > entries[entries.length - 1].score;
  }
}
