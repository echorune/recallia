import { Router } from 'express';
import { CardService } from './cardService';
import { CSVParser, ColumnMapping } from '../../core/csv/csvParser';
import { CSVExporter } from '../../core/csv/csvExporter';
import { JSONBackupManager } from '../../core/csv/jsonBackup';
import { requireAuth, AuthenticatedRequest, optionalAuth } from '../auth/authMiddleware';

export const cardRouter = Router();

/**
 * List & search cards
 */
cardRouter.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, subjectId, topicId, deckId, search, difficulty, limit, offset } = req.query;

    const result = CardService.listCards({
      courseId: typeof courseId === 'string' ? courseId : undefined,
      subjectId: typeof subjectId === 'string' ? subjectId : undefined,
      topicId: typeof topicId === 'string' ? topicId : undefined,
      deckId: typeof deckId === 'string' ? deckId : undefined,
      search: typeof search === 'string' ? search : undefined,
      difficulty: difficulty ? parseInt(String(difficulty), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list cards.' });
  }
});

/**
 * Get card by ID with complete version history
 */
cardRouter.get('/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const data = CardService.getCard(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }
    res.json({ success: true, card: data.card, versions: data.versions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new card
 */
cardRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { front, back, courseId, subjectId, topicId, deckId, difficulty, tags, answerKey } = req.body;
    const card = CardService.createCard(req.user!.id, {
      front,
      back,
      courseId,
      subjectId,
      topicId,
      deckId,
      difficulty,
      tags,
      answerKey,
    });
    res.status(201).json({ success: true, card, message: 'Card created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create card.' });
  }
});

/**
 * Update an existing card (records version history if front/back modified)
 */
cardRouter.put('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { front, back, difficulty, tags, answerKey, topicId, deckId } = req.body;
    const updated = CardService.updateCard(req.params.id, req.user!.id, {
      front,
      back,
      difficulty,
      tags,
      answerKey,
      topicId,
      deckId,
    });
    res.json({ success: true, card: updated, message: 'Card updated successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update card.' });
  }
});

/**
 * Delete a card
 */
cardRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const success = CardService.deleteCard(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }
    res.json({ success: true, message: 'Card deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate CSV import preview with auto-delimiter, column suggestions, and duplicate checking
 */
cardRouter.post('/preview-csv', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { rawContent, customDelimiter, mapping, targetScope } = req.body;
    if (!rawContent || typeof rawContent !== 'string') {
      res.status(400).json({ error: 'rawContent is required.' });
      return;
    }

    // Auto-parse headers & suggest mapping if not provided
    const parsed = CSVParser.parseRawContent(rawContent, customDelimiter);
    const resolvedMapping: ColumnMapping = mapping || CSVParser.suggestMapping(parsed.headers);

    // Fetch existing fronts in target scope for duplicate detection
    const existingFronts = CardService.getExistingFrontsInScope(targetScope || {});

    const preview = CSVParser.generatePreview(rawContent, resolvedMapping, existingFronts, customDelimiter);

    res.json({
      success: true,
      suggestedMapping: resolvedMapping,
      ...preview,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to parse CSV preview.' });
  }
});

/**
 * Commit bulk CSV import
 */
cardRouter.post('/import', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { target, cards } = req.body;
    if (!Array.isArray(cards) || cards.length === 0) {
      res.status(400).json({ error: 'No cards provided for import.' });
      return;
    }

    const count = CardService.bulkImportCards(req.user!.id, target || {}, cards);
    res.json({
      success: true,
      importedCount: count,
      message: `Successfully imported ${count} flashcards.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Import failed.' });
  }
});

/**
 * Export cards to CSV
 */
cardRouter.get('/export/csv', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, subjectId, deckId } = req.query;
    const cards = CardService.exportCards({
      courseId: typeof courseId === 'string' ? courseId : undefined,
      subjectId: typeof subjectId === 'string' ? subjectId : undefined,
      deckId: typeof deckId === 'string' ? deckId : undefined,
    });

    const csvData = CSVExporter.toCSV(cards);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="recallia_export.csv"');
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Export failed.' });
  }
});

/**
 * Export cards to structured JSON backup
 */
cardRouter.get('/export/json', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, subjectId, deckId, title } = req.query;
    const cards = CardService.exportCards({
      courseId: typeof courseId === 'string' ? courseId : undefined,
      subjectId: typeof subjectId === 'string' ? subjectId : undefined,
      deckId: typeof deckId === 'string' ? deckId : undefined,
    });

    const backup = JSONBackupManager.createBackup(
      deckId ? 'deck' : subjectId ? 'subject' : 'course',
      typeof title === 'string' ? title : 'Recallia Collection',
      cards
    );

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="recallia_backup.json"');
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'JSON backup failed.' });
  }
});

/**
 * Restore from structured JSON backup
 */
cardRouter.post('/restore/json', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const backupData = req.body;
    const validation = JSONBackupManager.validateBackup(backupData);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { target } = req.body;
    const count = CardService.bulkImportCards(
      req.user!.id,
      target || {},
      backupData.cards.map((c: any) => ({
        front: c.front,
        back: c.back,
        difficulty: c.difficulty,
        tags: c.tags,
        answerKey: c.answerKey,
      }))
    );

    res.json({
      success: true,
      restoredCount: count,
      message: `Successfully restored ${count} cards from backup.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Restore failed.' });
  }
});
