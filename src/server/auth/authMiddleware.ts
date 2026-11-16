import { Request, Response, NextFunction } from 'express';
import { AuthService } from './authService';
import { User, Session } from '../../core/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: Session;
  token?: string;
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string') {
    return customHeader.trim();
  }
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Authentication required. Please provide a valid session token.',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const sessionData = AuthService.getSessionUser(token);
  if (!sessionData) {
    res.status(401).json({
      error: 'Session has expired or is invalid. Please log in again.',
      code: 'SESSION_EXPIRED'
    });
    return;
  }

  req.user = sessionData.user;
  req.session = sessionData.session;
  req.token = token;
  next();
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const sessionData = AuthService.getSessionUser(token);
    if (sessionData) {
      req.user = sessionData.user;
      req.session = sessionData.session;
      req.token = token;
    }
  }
  next();
}
