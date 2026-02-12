import { HighScoreEntry } from '../types';

const STORAGE_KEY = 'essentia_high_scores';
const MAX_ENTRIES = 5;
const MAX_NAME_LENGTH = 8;

class HighScoreManagerClass {
  highScores(): HighScoreEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as HighScoreEntry[];
    } catch { /* ignore */ }
    return [];
  }

  isHighScore(score: number): boolean {
    const scores = this.highScores();
    if (scores.length < MAX_ENTRIES) return score > 0;
    return score > (scores[scores.length - 1]?.score ?? 0);
  }

  addScore(name: string, score: number): HighScoreEntry[] {
    const trimmed = name.substring(0, MAX_NAME_LENGTH).toUpperCase();
    const entry: HighScoreEntry = {
      name: trimmed || 'AAA',
      score,
    };

    const scores = this.highScores();
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, MAX_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(top));
    return top;
  }
}

export const HighScoreManager = new HighScoreManagerClass();
