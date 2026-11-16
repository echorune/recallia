/**
 * SM-2 Spaced Repetition Scheduling Engine
 * Independent of UI and persistence.
 * Uses an injectable Clock for deterministic calculation.
 */

import { Clock, ReviewRating, SM2State, SystemClock } from '../types';

export interface SM2Config {
  minimumEaseFactor: number;
  initialEaseFactor: number;
  hardIntervalMultiplier: number;
  easyBonusMultiplier: number;
}

export const DEFAULT_SM2_CONFIG: SM2Config = {
  minimumEaseFactor: 1.30,
  initialEaseFactor: 2.50,
  hardIntervalMultiplier: 1.20,
  easyBonusMultiplier: 1.30,
};

export class SM2Scheduler {
  private clock: Clock;
  private config: SM2Config;

  constructor(clock: Clock = new SystemClock(), config: SM2Config = DEFAULT_SM2_CONFIG) {
    this.clock = clock;
    this.config = config;
  }

  getClock(): Clock {
    return this.clock;
  }

  setClock(clock: Clock): void {
    this.clock = clock;
  }

  /**
   * Initializes state for a brand-new flashcard
   */
  createInitialState(): SM2State {
    const now = this.clock.now();
    return {
      easeFactor: this.config.initialEaseFactor,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      state: 'new',
      dueDate: now,
      lastReviewedAt: null,
    };
  }

  /**
   * Calculates the next state based on the user's review rating.
   */
  calculateNextReview(currentState: SM2State, rating: ReviewRating): SM2State {
    const now = this.clock.now();
    let { easeFactor, intervalDays, repetitions, lapses } = currentState;
    let nextState: 'new' | 'learning' | 'review' | 'relearning' = 'review';

    if (rating === 'again') {
      // Failed recall
      repetitions = 0;
      intervalDays = 1; // Due tomorrow
      lapses += 1;
      nextState = 'relearning';
      // Decrease ease factor
      easeFactor = Math.max(this.config.minimumEaseFactor, Number((easeFactor - 0.20).toFixed(2)));
    } else if (rating === 'hard') {
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 3;
      } else {
        intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * this.config.hardIntervalMultiplier));
      }
      easeFactor = Math.max(this.config.minimumEaseFactor, Number((easeFactor - 0.15).toFixed(2)));
      nextState = 'review';
    } else if (rating === 'good') {
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 6;
      } else {
        intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * easeFactor));
      }
      // Ease factor remains stable for 'good' (standard SM-2 formula: q=4 => EF delta = 0)
      nextState = 'review';
    } else if (rating === 'easy') {
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 3;
      } else if (repetitions === 2) {
        intervalDays = 8;
      } else {
        intervalDays = Math.max(intervalDays + 2, Math.round(intervalDays * easeFactor * this.config.easyBonusMultiplier));
      }
      easeFactor = Number((easeFactor + 0.15).toFixed(2));
      nextState = 'review';
    }

    // Calculate due date
    const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    return {
      easeFactor,
      intervalDays,
      repetitions,
      lapses,
      state: nextState,
      dueDate,
      lastReviewedAt: now,
    };
  }

  /**
   * Determines if a card is due for review at the current clock time.
   */
  isDue(state: SM2State): boolean {
    return state.dueDate.getTime() <= this.clock.now().getTime();
  }
}
