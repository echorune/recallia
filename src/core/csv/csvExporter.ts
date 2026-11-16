/**
 * Recallia CSV Export Engine
 * Exports cards into clean, round-trip compatible CSV files.
 */

export interface ExportableCard {
  id: string;
  front: string;
  back: string;
  answerKey?: string | null;
  difficulty: number;
  tags: string[] | string;
  subjectName?: string | null;
  topicName?: string | null;
  deckTitle?: string | null;
}

export class CSVExporter {
  /**
   * Safely escapes and quotes a CSV field
   */
  static escapeField(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  /**
   * Converts a collection of cards into a standard CSV string
   */
  static toCSV(cards: ExportableCard[]): string {
    const headers = [
      'id',
      'front',
      'back',
      'answerKey',
      'difficulty',
      'tags',
      'subject',
      'topic',
      'deck',
    ];

    const lines: string[] = [headers.join(',')];

    for (const card of cards) {
      let tagsStr = '';
      if (Array.isArray(card.tags)) {
        tagsStr = card.tags.join(';');
      } else if (typeof card.tags === 'string') {
        try {
          const parsed = JSON.parse(card.tags);
          tagsStr = Array.isArray(parsed) ? parsed.join(';') : card.tags;
        } catch {
          tagsStr = card.tags;
        }
      }

      const row = [
        this.escapeField(card.id),
        this.escapeField(card.front),
        this.escapeField(card.back),
        this.escapeField(card.answerKey || ''),
        this.escapeField(card.difficulty || 2),
        this.escapeField(tagsStr),
        this.escapeField(card.subjectName || ''),
        this.escapeField(card.topicName || ''),
        this.escapeField(card.deckTitle || ''),
      ];

      lines.push(row.join(','));
    }

    return lines.join('\r\n');
  }
}
