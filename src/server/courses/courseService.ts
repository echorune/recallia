import crypto from 'node:crypto';
import { getDb } from '../db';
import { Course, EnrollmentStatus, Subject, Topic } from '../../core/types';
import { EnrollmentStateMachine } from '../../core/enrollment/stateMachine';

export interface CourseWithEnrollment extends Course {
  enrollmentStatus: EnrollmentStatus | null;
  enrolledAt: string | null;
  subjectCount: number;
  topicCount: number;
  cardCount: number;
}

export interface DeckItem {
  id: string;
  userId: string;
  courseId: string | null;
  subjectId: string | null;
  topicId: string | null;
  title: string;
  description: string;
  color: string;
  isStandalone: boolean;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export class CourseService {
  /**
   * Retrieves all courses visible to user, with their enrollment status
   */
  static listCourses(userId?: string): CourseWithEnrollment[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        c.id, c.user_id, c.code, c.title, c.description, c.color, c.is_public, c.created_at,
        e.status AS enrollment_status, e.enrolled_at,
        (SELECT COUNT(*) FROM subjects s WHERE s.course_id = c.id) AS subject_count,
        (SELECT COUNT(*) FROM topics t JOIN subjects s ON t.subject_id = s.id WHERE s.course_id = c.id) AS topic_count,
        (SELECT COUNT(*) FROM cards cd WHERE cd.course_id = c.id) AS card_count
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
      WHERE c.is_public = 1 OR c.user_id = ?
      ORDER BY c.created_at ASC
    `).all(userId || '', userId || '') as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      code: r.code,
      title: r.title,
      description: r.description || '',
      color: r.color || '#0F4C5C',
      isPublic: Boolean(r.is_public),
      createdAt: r.created_at,
      enrollmentStatus: (r.enrollment_status as EnrollmentStatus) || null,
      enrolledAt: r.enrolled_at || null,
      subjectCount: Number(r.subject_count || 0),
      topicCount: Number(r.topic_count || 0),
      cardCount: Number(r.card_count || 0),
    }));
  }

  /**
   * Creates a new course and auto-enrolls the creator
   */
  static createCourse(
    userId: string,
    data: { code: string; title: string; description?: string; color?: string; isPublic?: boolean }
  ): CourseWithEnrollment {
    if (!data.title || data.title.trim().length < 2) {
      throw new Error('Course title must be at least 2 characters.');
    }
    if (!data.code || data.code.trim().length < 2) {
      throw new Error('Course code must be at least 2 characters.');
    }

    const cleanCode = data.code.trim().toUpperCase();
    const cleanTitle = data.title.trim();
    const db = getDb();

    // Check code uniqueness
    const existing = db.prepare('SELECT id FROM courses WHERE code = ?').get(cleanCode);
    if (existing) {
      throw new Error(`A course with code '${cleanCode}' already exists.`);
    }

    const courseId = crypto.randomUUID();
    const now = new Date().toISOString();
    const color = data.color || '#0F4C5C';
    const isPublic = data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : 1;

    db.prepare(`
      INSERT INTO courses (id, user_id, code, title, description, color, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(courseId, userId, cleanCode, cleanTitle, data.description || '', color, isPublic, now);

    // Auto-enroll the creator
    const enrollmentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at, updated_at)
      VALUES (?, ?, ?, 'enrolled', ?, ?)
    `).run(enrollmentId, userId, courseId, now, now);

    return {
      id: courseId,
      userId,
      code: cleanCode,
      title: cleanTitle,
      description: data.description || '',
      color,
      isPublic: Boolean(isPublic),
      createdAt: now,
      enrollmentStatus: 'enrolled',
      enrolledAt: now,
      subjectCount: 0,
      topicCount: 0,
      cardCount: 0,
    };
  }

  /**
   * Retrieves full course details including subjects, topics, and topic preferences
   */
  static getCourseDetails(courseId: string, userId?: string): any {
    const db = getDb();
    const course = db.prepare(`
      SELECT 
        c.id, c.user_id, c.code, c.title, c.description, c.color, c.is_public, c.created_at,
        e.status AS enrollment_status, e.enrolled_at, e.updated_at AS enrollment_updated_at
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
      WHERE c.id = ?
    `).get(userId || '', courseId) as any;

    if (!course) {
      throw new Error('Course not found.');
    }

    // Get subjects
    const subjects = db.prepare(`
      SELECT id, course_id, name, slug, code, description, color, display_order
      FROM subjects
      WHERE course_id = ?
      ORDER BY display_order ASC, name ASC
    `).all(courseId) as any[];

    // Get all topic preferences for user
    const prefRows = userId
      ? (db.prepare(`
          SELECT topic_id, is_enabled FROM student_topic_preferences WHERE user_id = ?
        `).all(userId) as any[])
      : [];
    const prefMap = new Map<string, boolean>();
    for (const pr of prefRows) {
      prefMap.set(pr.topic_id, Boolean(pr.is_enabled));
    }

    // Populate topics per subject
    const subjectList = subjects.map((subj) => {
      const topics = db.prepare(`
        SELECT 
          t.id, t.subject_id, t.name, t.slug, t.description, t.display_order,
          (SELECT COUNT(*) FROM cards c WHERE c.topic_id = t.id) AS card_count
        FROM topics t
        WHERE t.subject_id = ?
        ORDER BY t.display_order ASC, t.name ASC
      `).all(subj.id) as any[];

      const topicDetails = topics.map((top) => ({
        id: top.id,
        subjectId: top.subject_id,
        name: top.name,
        slug: top.slug,
        description: top.description || '',
        cardCount: Number(top.card_count || 0),
        isEnabled: prefMap.has(top.id) ? prefMap.get(top.id)! : true, // default enabled
      }));

      const totalSubjectCards = topicDetails.reduce((sum, t) => sum + t.cardCount, 0);

      return {
        id: subj.id,
        courseId: subj.course_id,
        name: subj.name,
        slug: subj.slug,
        code: subj.code,
        description: subj.description || '',
        color: subj.color,
        cardCount: totalSubjectCards,
        topics: topicDetails,
      };
    });

    return {
      id: course.id,
      userId: course.user_id,
      code: course.code,
      title: course.title,
      description: course.description || '',
      color: course.color,
      isPublic: Boolean(course.is_public),
      createdAt: course.created_at,
      enrollment: course.enrollment_status
        ? {
            status: course.enrollment_status as EnrollmentStatus,
            enrolledAt: course.enrolled_at,
            updatedAt: course.enrollment_updated_at,
          }
        : null,
      subjects: subjectList,
    };
  }

  /**
   * Changes enrollment status enforcing state machine transitions.
   * Completely preserves review history!
   */
  static changeEnrollmentStatus(
    userId: string,
    courseId: string,
    targetStatus: EnrollmentStatus
  ): { status: EnrollmentStatus; updatedAt: string } {
    const db = getDb();

    // Verify course exists
    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      throw new Error('Course not found.');
    }

    // Get current enrollment
    const current = db.prepare(`
      SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ?
    `).get(userId, courseId) as any;

    const currentStatus = (current ? current.status : null) as EnrollmentStatus | null;

    // Validate transition via pure state machine
    const validatedStatus = EnrollmentStateMachine.transition(currentStatus, targetStatus);
    const now = new Date().toISOString();

    if (!current) {
      // First-time enrollment
      const enrollmentId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(enrollmentId, userId, courseId, validatedStatus, now, now);
    } else {
      // Transition existing enrollment
      db.prepare(`
        UPDATE enrollments SET status = ?, updated_at = ? WHERE id = ?
      `).run(validatedStatus, now, current.id);
    }

    return { status: validatedStatus, updatedAt: now };
  }

  /**
   * Retrieves all topic preferences for a student
   */
  static getTopicPreferences(userId: string): Record<string, boolean> {
    const db = getDb();
    const rows = db.prepare(`
      SELECT topic_id, is_enabled FROM student_topic_preferences WHERE user_id = ?
    `).all(userId) as any[];

    const result: Record<string, boolean> = {};
    for (const r of rows) {
      result[r.topic_id] = Boolean(r.is_enabled);
    }
    return result;
  }

  /**
   * Toggles an individual topic's enabled status for a student
   */
  static toggleTopicPreference(userId: string, topicId: string, isEnabled?: boolean): boolean {
    const db = getDb();
    const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
    if (!topic) {
      throw new Error('Topic not found.');
    }

    const current = db.prepare(`
      SELECT id, is_enabled FROM student_topic_preferences WHERE user_id = ? AND topic_id = ?
    `).get(userId, topicId) as any;

    const nextState = isEnabled !== undefined ? (isEnabled ? 1 : 0) : current ? (current.is_enabled ? 0 : 1) : 0;
    const now = new Date().toISOString();

    if (!current) {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO student_topic_preferences (id, user_id, topic_id, is_enabled, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, topicId, nextState, now);
    } else {
      db.prepare(`
        UPDATE student_topic_preferences SET is_enabled = ?, updated_at = ? WHERE id = ?
      `).run(nextState, now, current.id);
    }

    return Boolean(nextState);
  }

  /**
   * Bulk toggles all topics under a subject
   */
  static bulkToggleSubjectTopics(userId: string, subjectId: string, isEnabled: boolean): number {
    const db = getDb();
    const topics = db.prepare('SELECT id FROM topics WHERE subject_id = ?').all(subjectId) as any[];
    const stateVal = isEnabled ? 1 : 0;
    const now = new Date().toISOString();

    const insertOrUpdate = db.prepare(`
      INSERT INTO student_topic_preferences (id, user_id, topic_id, is_enabled, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, topic_id) DO UPDATE SET is_enabled = excluded.is_enabled, updated_at = excluded.updated_at
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const t of topics) {
        insertOrUpdate.run(crypto.randomUUID(), userId, t.id, stateVal, now);
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    return topics.length;
  }

  /**
   * Lists standalone decks and course decks
   */
  static listDecks(userId: string): DeckItem[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        d.id, d.user_id, d.course_id, d.subject_id, d.topic_id, d.title, d.description,
        d.color, d.is_standalone, d.created_at, d.updated_at,
        (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
      FROM decks d
      WHERE d.user_id = ? OR d.user_id IS NULL
      ORDER BY d.created_at DESC
    `).all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      courseId: r.course_id,
      subjectId: r.subject_id,
      topicId: r.topic_id,
      title: r.title,
      description: r.description || '',
      color: r.color || '#0F4C5C',
      isStandalone: Boolean(r.is_standalone),
      cardCount: Number(r.card_count || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Creates a standalone deck
   */
  static createDeck(
    userId: string,
    data: {
      title: string;
      description?: string;
      color?: string;
      isStandalone?: boolean;
      courseId?: string;
      subjectId?: string;
      topicId?: string;
    }
  ): DeckItem {
    if (!data.title || data.title.trim().length < 2) {
      throw new Error('Deck title must be at least 2 characters.');
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const isStandalone = data.isStandalone !== undefined ? (data.isStandalone ? 1 : 0) : 1;
    const color = data.color || '#0A9396';

    db.prepare(`
      INSERT INTO decks (id, user_id, course_id, subject_id, topic_id, title, description, color, is_standalone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.courseId || null,
      data.subjectId || null,
      data.topicId || null,
      data.title.trim(),
      data.description || '',
      color,
      isStandalone,
      now,
      now
    );

    return {
      id,
      userId,
      courseId: data.courseId || null,
      subjectId: data.subjectId || null,
      topicId: data.topicId || null,
      title: data.title.trim(),
      description: data.description || '',
      color,
      isStandalone: Boolean(isStandalone),
      cardCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }
}
