/**
 * Recallia Core Domain Types
 */

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class SimulatedClock implements Clock {
  private currentTime: Date;

  constructor(initialTime?: Date | string) {
    this.currentTime = initialTime ? new Date(initialTime) : new Date();
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  set(time: Date | string): void {
    this.currentTime = new Date(time);
  }

  advanceDays(days: number): void {
    const next = new Date(this.currentTime);
    next.setDate(next.getDate() + days);
    this.currentTime = next;
  }

  advanceHours(hours: number): void {
    const next = new Date(this.currentTime);
    next.setHours(next.getHours() + hours);
    this.currentTime = next;
  }
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  dueDate: Date;
  lastReviewedAt: Date | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UserWithSecrets extends User {
  passwordHash: string;
  salt: string;
  resetToken?: string | null;
  resetExpires?: string | null;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export type EnrollmentStatus = 'enrolled' | 'paused' | 'completed' | 'withdrawn';

export interface Course {
  id: string;
  userId?: string | null;
  code: string;
  title: string;
  description: string;
  color: string;
  isPublic: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  courseId: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  color: string;
  displayOrder: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

export interface Flashcard {
  id: string;
  userId?: string | null;
  courseId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  originalId?: string;
  front: string;
  back: string;
  answerKey?: string;
  difficulty: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CardReviewState {
  id: string;
  userId: string;
  cardId: string;
  state: 'new' | 'learning' | 'review' | 'relearning';
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueDate: string;
  lastReviewedAt: string | null;
}

export interface ReviewLog {
  id: string;
  userId: string;
  cardId: string;
  rating: ReviewRating;
  scheduledDays: number;
  actualDays: number;
  easeFactor: number;
  reviewDurationMs?: number;
  reviewedAt: string;
}
