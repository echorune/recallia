import crypto from 'node:crypto';
import { getDb } from '../db';
import { Flashcard } from '../../core/types';
import { ExportableCard } from '../../core/csv/csvExporter';

export interface CardQueryFilter {
  userId?: string;
  courseId?: string;
  subjectId?: string;
  topicId?: string;
  deckId?: string;
  search?: string;
  difficulty?: number;
  limit?: number;
  offset?: number;
}

export interface CardVersion {
  id: string;
  cardId: string;
  versionNumber: number;
  front: string;
  back: string;
  answerKey: string | null;
  difficulty: number;
  tags: string[];
  createdAt: string;
}

export class CardService {
  /**
   * Lists cards with advanced search, filters, and pagination
   */
  static listCards(filter: CardQueryFilter = {}): { total: number; cards: any[] } {
    const db = getDb();
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filter.courseId) {
      conditions.push('c.course_id = ?');
      params.push(filter.courseId);
    }
    if (filter.subjectId) {
      conditions.push('c.subject_id = ?');
      params.push(filter.subjectId);
    }
    if (filter.topicId) {
      conditions.push('c.topic_id = ?');
      params.push(filter.topicId);
    }
    if (filter.deckId) {
      conditions.push('c.deck_id = ?');
      params.push(filter.deckId);
    }
    if (filter.difficulty) {
      conditions.push('c.difficulty = ?');
      params.push(filter.difficulty);
    }
    if (filter.search && filter.search.trim().length > 0) {
      const q = `%${filter.search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(c.front) LIKE ? OR LOWER(c.back) LIKE ? OR LOWER(c.tags) LIKE ?)');
      params.push(q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM cards c
      WHERE ${whereClause}
    `).get(...params) as any;
    const total = Number(countRow?.total || 0);

    // Data query with relations
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const dataParams = [...params, limit, offset];
    const rows = db.prepare(`
      SELECT 
        c.id, c.user_id, c.course_id, c.subject_id, c.topic_id, c.deck_id,
        c.original_id, c.front, c.back, c.answer_key, c.difficulty, c.tags,
        c.created_at, c.updated_at,
        s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
        t.name AS topic_name,
        d.title AS deck_title,
        (SELECT COUNT(*) FROM card_versions cv WHERE cv.card_id = c.id) AS version_count
      FROM cards c
      LEFT JOIN subjects s ON c.subject_id = s.id
      LEFT JOIN topics t ON c.topic_id = t.id
      LEFT JOIN decks d ON c.deck_id = d.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `).all(...dataParams) as any[];

    const cards = rows.map((r) => {
      let parsedTags: string[] = [];
      try {
        parsedTags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [];
      } catch {
        parsedTags = [];
      }

      return {
        id: r.id,
        userId: r.user_id,
        courseId: r.course_id,
        subjectId: r.subject_id,
        topicId: r.topic_id,
        deckId: r.deck_id,
        originalId: r.original_id,
        front: r.front,
        back: r.back,
        answerKey: r.answer_key,
        difficulty: r.difficulty,
        tags: parsedTags,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        subjectName: r.subject_name || null,
        subjectCode: r.subject_code || null,
        subjectColor: r.subject_color || null,
        topicName: r.topic_name || null,
        deckTitle: r.deck_title || null,
        versionCount: Number(r.version_count || 1),
      };
    });

    return { total, cards };
  }

  /**
   * Retrieves single card and its complete version history
   */
  static getCard(cardId: string): { card: any; versions: CardVersion[] } | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT 
        c.id, c.user_id, c.course_id, c.subject_id, c.topic_id, c.deck_id,
        c.original_id, c.front, c.back, c.answer_key, c.difficulty, c.tags,
        c.created_at, c.updated_at,
        s.name AS subject_name, t.name AS topic_name, d.title AS deck_title
      FROM cards c
      LEFT JOIN subjects s ON c.subject_id = s.id
      LEFT JOIN topics t ON c.topic_id = t.id
      LEFT JOIN decks d ON c.deck_id = d.id
      WHERE c.id = ?
    `).get(cardId) as any;

    if (!row) return null;

    let parsedTags: string[] = [];
    try {
      parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [];
    } catch {
      parsedTags = [];
    }

    // Get version history
    const versionRows = db.prepare(`
      SELECT id, card_id, version_number, front, back, answer_key, difficulty, tags, created_at
      FROM card_versions
      WHERE card_id = ?
      ORDER BY version_number DESC
    `).all(cardId) as any[];

    const versions = versionRows.map((v) => {
      let vTags: string[] = [];
      try {
        vTags = typeof v.tags === 'string' ? JSON.parse(v.tags) : v.tags || [];
      } catch {
        vTags = [];
      }
      return {
        id: v.id,
        cardId: v.card_id,
        versionNumber: v.version_number,
        front: v.front,
        back: v.back,
        answerKey: v.answer_key,
        difficulty: v.difficulty,
        tags: vTags,
        createdAt: v.created_at,
      };
    });

    return {
      card: {
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        subjectId: row.subject_id,
        topicId: row.topic_id,
        deckId: row.deck_id,
        originalId: row.original_id,
        front: row.front,
        back: row.back,
        answerKey: row.answer_key,
        difficulty: row.difficulty,
        tags: parsedTags,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        subjectName: row.subject_name,
        topicName: row.topic_name,
        deckTitle: row.deck_title,
        versionCount: Number(versionRows.length || 1),
      },
      versions,
    };
  }

  /**
   * Creates a new flashcard and stores initial version (v1)
   */
  static createCard(
    userId: string,
    data: {
      front: string;
      back: string;
      courseId?: string;
      subjectId?: string;
      topicId?: string;
      deckId?: string;
      difficulty?: number;
      tags?: string[];
      answerKey?: string;
    }
  ): any {
    if (!data.front || data.front.trim().length === 0) {
      throw new Error('Card front cannot be empty.');
    }
    if (!data.back || data.back.trim().length === 0) {
      throw new Error('Card back cannot be empty.');
    }

    const db = getDb();
    const cardId = crypto.randomUUID();
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(data.tags || []);
    const difficulty = data.difficulty || 2;

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO cards (
          id, user_id, course_id, subject_id, topic_id, deck_id,
          front, back, answer_key, difficulty, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cardId,
        userId,
        data.courseId || null,
        data.subjectId || null,
        data.topicId || null,
        data.deckId || null,
        data.front.trim(),
        data.back.trim(),
        data.answerKey || null,
        difficulty,
        tagsJson,
        now,
        now
      );

      // Record Version 1
      db.prepare(`
        INSERT INTO card_versions (
          id, card_id, version_number, front, back, answer_key, difficulty, tags, created_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        cardId,
        data.front.trim(),
        data.back.trim(),
        data.answerKey || null,
        difficulty,
        tagsJson,
        now
      );

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getCard(cardId)?.card;
  }

  /**
   * Updates a card and appends a new version entry if front or back changed
   */
  static updateCard(
    cardId: string,
    userId: string,
    data: {
      front?: string;
      back?: string;
      difficulty?: number;
      tags?: string[];
      answerKey?: string;
      topicId?: string;
      deckId?: string;
    }
  ): any {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as any;
    if (!existing) {
      throw new Error('Card not found.');
    }

    const front = data.front !== undefined ? data.front.trim() : existing.front;
    const back = data.back !== undefined ? data.back.trim() : existing.back;
    const difficulty = data.difficulty !== undefined ? data.difficulty : existing.difficulty;
    const answerKey = data.answerKey !== undefined ? data.answerKey : existing.answer_key;
    const tagsJson = data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags;
    const topicId = data.topicId !== undefined ? data.topicId : existing.topic_id;
    const deckId = data.deckId !== undefined ? data.deckId : existing.deck_id;

    if (!front) throw new Error('Card front cannot be empty.');
    if (!back) throw new Error('Card back cannot be empty.');

    const isContentChanged = front !== existing.front || back !== existing.back;
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE cards
        SET front = ?, back = ?, answer_key = ?, difficulty = ?, tags = ?, topic_id = ?, deck_id = ?, updated_at = ?
        WHERE id = ?
      `).run(front, back, answerKey, difficulty, tagsJson, topicId, deckId, now, cardId);

      if (isContentChanged) {
        // Find latest version number
        const latest = db.prepare(`
          SELECT MAX(version_number) as v FROM card_versions WHERE card_id = ?
        `).get(cardId) as any;
        const nextVersion = (latest?.v || 1) + 1;

        db.prepare(`
          INSERT INTO card_versions (
            id, card_id, version_number, front, back, answer_key, difficulty, tags, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), cardId, nextVersion, front, back, answerKey, difficulty, tagsJson, now);
      }

      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    return this.getCard(cardId)?.card;
  }

  /**
   * Deletes a flashcard
   */
  static deleteCard(cardId: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
    return (res as any).changes > 0;
  }

  /**
   * Bulk imports validated cards into target course, subject, topic, or deck
   */
  static bulkImportCards(
    userId: string,
    target: {
      courseId?: string;
      subjectId?: string;
      topicId?: string;
      deckId?: string;
    },
    cards: Array<{
      front: string;
      back: string;
      difficulty?: number;
      tags?: string[];
      answerKey?: string;
    }>
  ): number {
    const db = getDb();
    const now = new Date().toISOString();

    const insertCard = db.prepare(`
      INSERT INTO cards (
        id, user_id, course_id, subject_id, topic_id, deck_id,
        front, back, answer_key, difficulty, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVersion = db.prepare(`
      INSERT INTO card_versions (
        id, card_id, version_number, front, back, answer_key, difficulty, tags, created_at
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const c of cards) {
        const cardId = crypto.randomUUID();
        const diff = c.difficulty || 2;
        const tagsJson = JSON.stringify(c.tags || []);

        insertCard.run(
          cardId,
          userId,
          target.courseId || null,
          target.subjectId || null,
          target.topicId || null,
          target.deckId || null,
          c.front.trim(),
          c.back.trim(),
          c.answerKey || null,
          diff,
          tagsJson,
          now,
          now
        );

        insertVersion.run(
          crypto.randomUUID(),
          cardId,
          c.front.trim(),
          c.back.trim(),
          c.answerKey || null,
          diff,
          tagsJson,
          now
        );
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    return cards.length;
  }

  /**
   * Exports cards matching query for CSV/JSON generation
   */
  static exportCards(filter: { courseId?: string; subjectId?: string; deckId?: string }): ExportableCard[] {
    const db = getDb();
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filter.courseId) {
      conditions.push('c.course_id = ?');
      params.push(filter.courseId);
    }
    if (filter.subjectId) {
      conditions.push('c.subject_id = ?');
      params.push(filter.subjectId);
    }
    if (filter.deckId) {
      conditions.push('c.deck_id = ?');
      params.push(filter.deckId);
    }

    const rows = db.prepare(`
      SELECT 
        c.id, c.front, c.back, c.answer_key, c.difficulty, c.tags,
        s.name AS subject_name, t.name AS topic_name, d.title AS deck_title
      FROM cards c
      LEFT JOIN subjects s ON c.subject_id = s.id
      LEFT JOIN topics t ON c.topic_id = t.id
      LEFT JOIN decks d ON c.deck_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.created_at ASC
    `).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      front: r.front,
      back: r.back,
      answerKey: r.answer_key,
      difficulty: r.difficulty,
      tags: r.tags,
      subjectName: r.subject_name,
      topicName: r.topic_name,
      deckTitle: r.deck_title,
    }));
  }

  /**
   * Retrieves all card front texts in target scope for duplicate checking
   */
  static getExistingFrontsInScope(target: { courseId?: string; subjectId?: string; deckId?: string }): Set<string> {
    const db = getDb();
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (target.courseId) {
      conditions.push('course_id = ?');
      params.push(target.courseId);
    }
    if (target.subjectId) {
      conditions.push('subject_id = ?');
      params.push(target.subjectId);
    }
    if (target.deckId) {
      conditions.push('deck_id = ?');
      params.push(target.deckId);
    }

    const rows = db.prepare(`SELECT front FROM cards WHERE ${conditions.join(' AND ')}`).all(...params) as any[];
    const set = new Set<string>();
    for (const r of rows) {
      set.add(r.front.toLowerCase().replace(/\s+/g, ' '));
    }
    return set;
  }
}
