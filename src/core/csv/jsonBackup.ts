/**
 * Recallia JSON Backup & Interchange Engine
 * Serializes and restores structured backups while preserving IDs and relations.
 */

export interface JSONBackupFormat {
  version: number;
  product: string;
  exportedAt: string;
  scope: 'course' | 'deck' | 'subject' | 'all';
  metadata: {
    title: string;
    description?: string;
    cardCount: number;
  };
  cards: Array<{
    id: string;
    front: string;
    back: string;
    answerKey?: string | null;
    difficulty: number;
    tags: string[];
    subject?: string | null;
    topic?: string | null;
    deck?: string | null;
  }>;
}

export class JSONBackupManager {
  static createBackup(
    scope: 'course' | 'deck' | 'subject' | 'all',
    title: string,
    cards: any[],
    description?: string
  ): JSONBackupFormat {
    return {
      version: 1,
      product: 'Recallia',
      exportedAt: new Date().toISOString(),
      scope,
      metadata: {
        title,
        description,
        cardCount: cards.length,
      },
      cards: cards.map((c) => {
        let tags: string[] = [];
        if (Array.isArray(c.tags)) {
          tags = c.tags;
        } else if (typeof c.tags === 'string') {
          try {
            tags = JSON.parse(c.tags);
          } catch {
            tags = c.tags.split(/[,;]/).map((t: string) => t.trim());
          }
        }

        return {
          id: c.id,
          front: c.front,
          back: c.back,
          answerKey: c.answer_key || c.answerKey || null,
          difficulty: c.difficulty || 2,
          tags,
          subject: c.subject_name || c.subject || null,
          topic: c.topic_name || c.topic || null,
          deck: c.deck_title || c.deck || null,
        };
      }),
    };
  }

  static validateBackup(data: any): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Backup file does not contain a valid JSON object.' };
    }
    if (data.product !== 'Recallia') {
      return { valid: false, error: 'File is not a valid Recallia backup format.' };
    }
    if (!Array.isArray(data.cards)) {
      return { valid: false, error: 'Backup missing cards collection.' };
    }
    for (let i = 0; i < data.cards.length; i++) {
      const c = data.cards[i];
      if (!c.front || !c.back) {
        return { valid: false, error: `Card at index ${i} is missing front or back content.` };
      }
    }
    return { valid: true };
  }
}
