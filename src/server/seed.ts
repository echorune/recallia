/**
 * Recallia Database Seed Script
 * Reads the pre-extracted JSON subject files in data/seeds/
 * and populates courses, subjects, topics, and flashcards.
 * Does NOT access test.csv directly.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb, closeDb } from './db';
import { AuthService } from './auth/authService';

async function seed() {
  console.log('[Recallia Seed] Initializing database seeding...');
  const db = getDb();
  const baseDir = process.cwd();
  const seedsDir = path.join(baseDir, 'data', 'seeds');
  const manifestPath = path.join(seedsDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}. Run npm run convert-data first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`[Recallia Seed] Loaded manifest: ${manifest.course.title}`);

  // Create or retrieve Course
  const courseCode = manifest.course.code || 'SCI-ARC';
  let course = db.prepare('SELECT id FROM courses WHERE code = ?').get(courseCode) as any;
  const now = new Date().toISOString();

  let courseId: string;
  if (!course) {
    courseId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO courses (id, code, title, description, color, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(courseId, courseCode, manifest.course.title, manifest.course.description, '#0F4C5C', now);
    console.log(`[Recallia Seed] Created course: ${manifest.course.title} (${courseId})`);
  } else {
    courseId = course.id;
    console.log(`[Recallia Seed] Course already exists: ${courseId}`);
  }

  // Insert or update Subjects & Topics
  let totalCardsInserted = 0;
  const insertCardStmt = db.prepare(`
    INSERT OR REPLACE INTO cards (
      id, user_id, course_id, subject_id, topic_id, original_id,
      front, back, answer_key, difficulty, tags, created_at, updated_at
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const topicCache = new Map<string, string>(); // key: `${subjectId}::${topicSlug}` => topicId

  for (const subjMeta of manifest.subjects) {
    const filePath = path.join(seedsDir, subjMeta.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Recallia Seed] Warning: Subject seed file ${subjMeta.file} missing! Skipping.`);
      continue;
    }

    const subjData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Check or insert Subject
    let subject = db.prepare('SELECT id FROM subjects WHERE slug = ?').get(subjData.slug) as any;
    let subjectId: string;
    if (!subject) {
      subjectId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO subjects (id, course_id, name, slug, code, description, color, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subjectId,
        courseId,
        subjData.subjectName,
        subjData.slug,
        subjData.code,
        subjData.description,
        subjData.color || '#0A9396',
        manifest.subjects.indexOf(subjMeta)
      );
    } else {
      subjectId = subject.id;
    }

    // Insert Topics
    for (let i = 0; i < subjData.topics.length; i++) {
      const top = subjData.topics[i];
      let topic = db.prepare('SELECT id FROM topics WHERE subject_id = ? AND slug = ?').get(subjectId, top.slug) as any;
      let topicId: string;
      if (!topic) {
        topicId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO topics (id, subject_id, name, slug, description, display_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(topicId, subjectId, top.name, top.slug, top.description, i);
      } else {
        topicId = topic.id;
      }
      topicCache.set(`${subjectId}::${top.name}`, topicId);
    }

    // Insert Cards in transaction
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const card of subjData.cards) {
        const topicId = topicCache.get(`${subjectId}::${card.topic}`) || null;
        const cardId = card.id || crypto.randomUUID();
        const tagsJson = JSON.stringify(card.tags || []);

        insertCardStmt.run(
          cardId,
          courseId,
          subjectId,
          topicId,
          card.id,
          card.front,
          card.back,
          card.answerKey,
          card.difficulty || 2,
          tagsJson,
          now,
          now
        );
        totalCardsInserted++;
      }
      db.exec('COMMIT;');
      console.log(`[Recallia Seed] Seeded ${subjData.cards.length} cards for ${subjData.subjectName}`);
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  }

  // Seed standard demo student for manual verification & evaluation
  const demoEmail = 'student@recallia.app';
  const existingStudent = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
  if (!existingStudent) {
    const { user } = AuthService.register('Alex Mercer', demoEmail, 'Recallia2026!');
    console.log(`[Recallia Seed] Created demo student account: ${user.email} (password: Recallia2026!)`);

    // Enroll demo student in the primary course
    db.prepare(`
      INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at, updated_at)
      VALUES (?, ?, ?, 'enrolled', ?, ?)
    `).run(crypto.randomUUID(), user.id, courseId, now, now);

    console.log(`[Recallia Seed] Enrolled demo student in ${manifest.course.title}`);
  }

  console.log(`[Recallia Seed] Seeding complete! Total cards processed: ${totalCardsInserted}`);
}

seed()
  .catch((err) => {
    console.error('[Recallia Seed] Error during seeding:', err);
    process.exit(1);
  })
  .finally(() => {
    closeDb();
  });
