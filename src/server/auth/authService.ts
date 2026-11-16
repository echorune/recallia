import crypto from 'node:crypto';
import { getDb } from '../db';
import { User, UserWithSecrets, Session } from '../../core/types';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export class AuthService {
  /**
   * Hashes a password using scrypt with a unique random salt
   */
  static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  /**
   * Constant-time password verification against stored salt and hash
   */
  static verifyPassword(password: string, storedHash: string, salt: string): boolean {
    const hashAttempt = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashAttemptBuffer = Buffer.from(hashAttempt, 'hex');
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    if (hashAttemptBuffer.length !== storedHashBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashAttemptBuffer, storedHashBuffer);
  }

  /**
   * Validates registration inputs
   */
  static validateRegistration(name: string, email: string, password: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length < 2) {
      return { valid: false, error: 'Full name must be at least 2 characters long.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return { valid: false, error: 'Please provide a valid email address.' };
    }

    if (!password || password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long.' };
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return { valid: false, error: 'Password must contain both letters and numbers.' };
    }

    return { valid: true };
  }

  /**
   * Registers a new student
   */
  static register(name: string, email: string, password: string): { user: User; session: Session } {
    const validation = this.validateRegistration(name, email, password);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    // Check email uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { hash, salt } = this.hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, salt, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name.trim(), normalizedEmail, hash, salt, now, now, now);

    const user: User = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    const session = this.createSession(userId);
    return { user, session };
  }

  /**
   * Authenticates a student and creates a new active session
   */
  static login(email: string, password: string): { user: User; session: Session } {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    const row = db.prepare(`
      SELECT id, name, email, password_hash, salt, created_at, updated_at, last_login_at
      FROM users WHERE email = ?
    `).get(normalizedEmail) as any;

    if (!row) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = this.verifyPassword(password, row.password_hash, row.salt);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, row.id);

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: now,
      lastLoginAt: now,
    };

    const session = this.createSession(row.id);
    return { user, session };
  }

  /**
   * Creates a cryptographically secure session token
   */
  static createSession(userId: string): Session {
    const db = getDb();
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(48).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
    const createdAt = now.toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userId, token, expiresAt, createdAt);

    return {
      id: sessionId,
      userId,
      token,
      expiresAt,
      createdAt,
    };
  }

  /**
   * Validates a session token and returns the corresponding User
   */
  static getSessionUser(token: string): { user: User; session: Session } | null {
    if (!token) return null;

    const db = getDb();
    const now = new Date().toISOString();

    const row = db.prepare(`
      SELECT 
        s.id AS session_id, s.token, s.expires_at, s.created_at AS session_created_at,
        u.id AS user_id, u.name, u.email, u.created_at AS user_created_at, u.updated_at, u.last_login_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as any;

    if (!row) return null;

    const user: User = {
      id: row.user_id,
      name: row.name,
      email: row.email,
      createdAt: row.user_created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };

    const session: Session = {
      id: row.session_id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      createdAt: row.session_created_at,
    };

    return { user, session };
  }

  /**
   * Revokes/deletes an active session
   */
  static logout(token: string): boolean {
    if (!token) return false;
    const db = getDb();
    const result = db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return (result as any).changes > 0;
  }

  /**
   * Generates a password reset token for a student
   */
  static requestPasswordReset(email: string): { token: string; expiresAt: string } | null {
    if (!email) return null;

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (!row) return null; // Gracefully handle non-existent emails without leaking existence

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    db.prepare(`
      UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?
    `).run(resetToken, expiresAt, row.id);

    return { token: resetToken, expiresAt };
  }

  /**
   * Resets password using a valid reset token
   */
  static resetPassword(resetToken: string, newPassword: string): boolean {
    if (!resetToken || !newPassword) {
      throw new Error('Reset token and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      throw new Error('Password must contain both letters and numbers.');
    }

    const db = getDb();
    const now = new Date().toISOString();

    const user = db.prepare(`
      SELECT id FROM users WHERE reset_token = ? AND reset_expires > ?
    `).get(resetToken, now) as any;

    if (!user) {
      throw new Error('Invalid or expired password reset token.');
    }

    const { hash, salt } = this.hashPassword(newPassword);

    db.prepare(`
      UPDATE users 
      SET password_hash = ?, salt = ?, reset_token = NULL, reset_expires = NULL, updated_at = ?
      WHERE id = ?
    `).run(hash, salt, now, user.id);

    // Invalidate all existing sessions on password change
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    return true;
  }
}
