import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { getDb } from './db';
import { authRouter } from './auth/authRoutes';
import { courseRouter } from './courses/courseRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure database initialized
const db = getDb();

// Subjects Manifest endpoint
app.get('/api/manifest', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const manifestPath = path.join(process.cwd(), 'data', 'seeds', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      res.json(manifest);
    } else {
      res.status(404).json({ error: 'Manifest not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check & status
app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as any;
  const courseCount = db.prepare('SELECT count(*) as count FROM courses').get() as any;
  const cardCount = db.prepare('SELECT count(*) as count FROM cards').get() as any;

  res.json({
    status: 'healthy',
    product: 'Recallia',
    tagline: 'Learn it. Recall it. Remember it.',
    stats: {
      users: userCount ? userCount.count : 0,
      courses: courseCount ? courseCount.count : 0,
      cards: cardCount ? cardCount.count : 0,
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/courses', courseRouter);

// Serve static build assets if available
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Start listener if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Recallia Server] Running on http://localhost:${PORT}`);
    console.log(`[Recallia Server] Health check available at http://localhost:${PORT}/api/health`);
  });
}

export default app;
