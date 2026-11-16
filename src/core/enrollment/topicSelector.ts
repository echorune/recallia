import { Flashcard } from '../types';

export interface TopicPreference {
  topicId: string;
  isEnabled: boolean;
}

export class TopicSelector {
  /**
   * Resolves whether a specific topic is enabled for a student.
   * If no explicit preference exists, defaults to true (enabled).
   */
  static isTopicEnabled(topicId: string, preferences: Map<string, boolean> | Record<string, boolean>): boolean {
    if (preferences instanceof Map) {
      if (preferences.has(topicId)) {
        return preferences.get(topicId)!;
      }
    } else if (Object.prototype.hasOwnProperty.call(preferences, topicId)) {
      return Boolean(preferences[topicId]);
    }
    return true; // Default to enabled
  }

  /**
   * Filters a collection of flashcards to only include those belonging to enabled topics.
   * Standalone cards or cards without a topic are retained.
   */
  static filterCardsForQueue<T extends { topicId?: string | null }>(
    cards: T[],
    preferences: Map<string, boolean> | Record<string, boolean>
  ): T[] {
    return cards.filter((card) => {
      // If card has no topicId (e.g. standalone deck card), it is always eligible
      if (!card.topicId) {
        return true;
      }
      return this.isTopicEnabled(card.topicId, preferences);
    });
  }

  /**
   * Filters cards for a focused study session (e.g. studying a single topic, subject, or deck)
   */
  static filterByScope<T extends { courseId?: string | null; subjectId?: string | null; topicId?: string | null }>(
    cards: T[],
    scope: { courseId?: string; subjectId?: string; topicId?: string }
  ): T[] {
    return cards.filter((card) => {
      if (scope.topicId && card.topicId !== scope.topicId) {
        return false;
      }
      if (scope.subjectId && card.subjectId !== scope.subjectId) {
        return false;
      }
      if (scope.courseId && card.courseId !== scope.courseId) {
        return false;
      }
      return true;
    });
  }
}
