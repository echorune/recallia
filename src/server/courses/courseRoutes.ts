import { Router } from 'express';
import { CourseService } from './courseService';
import { requireAuth, AuthenticatedRequest, optionalAuth } from '../auth/authMiddleware';
import { EnrollmentStatus } from '../../core/types';

export const courseRouter = Router();

/**
 * List courses visible to the user
 */
courseRouter.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const courses = CourseService.listCourses(req.user?.id);
    res.json({ success: true, courses });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list courses.' });
  }
});

/**
 * Create a custom course
 */
courseRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { code, title, description, color, isPublic } = req.body;
    const course = CourseService.createCourse(req.user!.id, {
      code,
      title,
      description,
      color,
      isPublic,
    });
    res.status(201).json({ success: true, course, message: 'Course successfully created.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create course.' });
  }
});

/**
 * Get detailed course hierarchy (subjects, topics, enrollment status, topic toggles)
 */
courseRouter.get('/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const course = CourseService.getCourseDetails(req.params.id, req.user?.id);
    res.json({ success: true, course });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Course not found.' });
  }
});

/**
 * Enroll in course
 */
courseRouter.post('/:id/enroll', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const result = CourseService.changeEnrollmentStatus(req.user!.id, req.params.id, 'enrolled');
    res.json({
      success: true,
      status: result.status,
      message: 'Successfully enrolled in course. Learning queue activated.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Enrollment failed.' });
  }
});

/**
 * Transition enrollment status (enrolled, paused, completed, withdrawn)
 */
courseRouter.post('/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body as { status: EnrollmentStatus };
    if (!status) {
      res.status(400).json({ error: "Target 'status' is required." });
      return;
    }

    const result = CourseService.changeEnrollmentStatus(req.user!.id, req.params.id, status);
    res.json({
      success: true,
      status: result.status,
      message: `Enrollment status transitioned to '${result.status}'. Review history preserved.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Status transition failed.' });
  }
});

/**
 * Get student topic preferences
 */
courseRouter.get('/preferences/topics', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const preferences = CourseService.getTopicPreferences(req.user!.id);
    res.json({ success: true, preferences });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load topic preferences.' });
  }
});

/**
 * Toggle individual topic preference
 */
courseRouter.post('/topics/:id/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { isEnabled } = req.body;
    const nextState = CourseService.toggleTopicPreference(req.user!.id, req.params.id, isEnabled);
    res.json({
      success: true,
      topicId: req.params.id,
      isEnabled: nextState,
      message: `Topic ${nextState ? 'enabled for' : 'excluded from'} daily reviews. Progress preserved.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update topic preference.' });
  }
});

/**
 * Bulk toggle all topics under a subject
 */
courseRouter.post('/subjects/:id/toggle-all', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      res.status(400).json({ error: "'isEnabled' boolean is required." });
      return;
    }

    const count = CourseService.bulkToggleSubjectTopics(req.user!.id, req.params.id, isEnabled);
    res.json({
      success: true,
      subjectId: req.params.id,
      topicsUpdated: count,
      isEnabled,
      message: `${count} topics ${isEnabled ? 'enabled' : 'disabled'}. Historical reviews preserved.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Bulk toggle failed.' });
  }
});

/**
 * List standalone decks
 */
courseRouter.get('/decks/all', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const decks = CourseService.listDecks(req.user!.id);
    res.json({ success: true, decks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list decks.' });
  }
});

/**
 * Create a standalone deck
 */
courseRouter.post('/decks/new', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, color, isStandalone, courseId, subjectId, topicId } = req.body;
    const deck = CourseService.createDeck(req.user!.id, {
      title,
      description,
      color,
      isStandalone,
      courseId,
      subjectId,
      topicId,
    });
    res.status(201).json({ success: true, deck, message: 'Deck created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create deck.' });
  }
});
