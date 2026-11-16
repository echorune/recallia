import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: DatabaseSync | null = null;

export function getDb(dbFilePath?: string): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const defaultPath = path.resolve(process.cwd(), 'recallia.db');
  const targetPath = dbFilePath || process.env.DATABASE_PATH || defaultPath;

  const dbDir = path.dirname(targetPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  
  // Pragmas for performance and data integrity
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  initSchema(db);

  dbInstance = db;
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      reset_token TEXT,
      reset_expires TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#0F4C5C',
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('enrolled', 'paused', 'completed', 'withdrawn')),
      enrolled_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#0A9396',
      display_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(subject_id, slug),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      subject_id TEXT,
      topic_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#0F4C5C',
      is_standalone INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
    CREATE INDEX IF NOT EXISTS idx_decks_course ON decks(course_id);

    CREATE TABLE IF NOT EXISTS student_topic_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, topic_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      subject_id TEXT,
      topic_id TEXT,
      deck_id TEXT,
      original_id TEXT,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      answer_key TEXT,
      difficulty INTEGER NOT NULL DEFAULT 2,
      tags TEXT, -- JSON array of strings
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_subject ON cards(subject_id);
    CREATE INDEX IF NOT EXISTS idx_cards_topic ON cards(topic_id);
    CREATE INDEX IF NOT EXISTS idx_cards_original_id ON cards(original_id);

    CREATE TABLE IF NOT EXISTS card_reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN ('new', 'learning', 'review', 'relearning')),
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      last_reviewed_at TEXT,
      UNIQUE(user_id, card_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_card_reviews_due ON card_reviews(user_id, due_date);

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      rating TEXT NOT NULL CHECK(rating IN ('again', 'hard', 'good', 'easy')),
      scheduled_days INTEGER NOT NULL,
      actual_days INTEGER NOT NULL,
      ease_factor REAL NOT NULL,
      review_duration_ms INTEGER,
      reviewed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_review_logs_user_date ON review_logs(user_id, reviewed_at);
  `);

  try {
    db.exec('ALTER TABLE cards ADD COLUMN deck_id TEXT REFERENCES decks(id) ON DELETE SET NULL;');
  } catch {
    // column already exists
  }

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);');
  } catch {
    // index creation ok
  }
}
