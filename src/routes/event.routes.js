import { Router } from 'express';
import Event from '../models/Event.js';
import Assessment from '../models/Assessment.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET / — List events (with auto-generated assessment events) ──
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;

    // 1. Fetch custom events
    let filter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    const customEvents = await Event.find(filter).sort({ date: 1 });
    let filteredCustomEvents = customEvents;
    if (req.user.role === 'student') {
      const userEnrolled = req.user.enrolled_courses || [];
      filteredCustomEvents = customEvents.filter(e => {
        if (!e.course_id) return true; // Platform-wide event
        return userEnrolled.includes(e.course_id);
      });
    }

    // 2. Auto-generate events from published assessments with dates
    let assessmentFilter = { status: 'published' };
    if (req.user.role === 'student') {
      const userEnrolled = req.user.enrolled_courses || [];
      if (userEnrolled.length > 0) {
        assessmentFilter.course_id = { $in: userEnrolled };
      } else {
        assessmentFilter.course_id = null; // Prevent fetching if 0 enrollments
      }
    }
    
    let assessments = [];
    if (req.user.role !== 'student' || assessmentFilter.course_id) {
      assessments = await Assessment.find(assessmentFilter);
    }

    const assessmentEvents = [];
    for (const a of assessments) {
      if (a.start_date) {
        assessmentEvents.push({
          id: `assessment-start-${a._id}`,
          title: `📝 ${a.title} (Opens)`,
          description: a.description || '',
          date: a.start_date,
          type: a.type,
          course_id: a.course_id,
          color: a.type === 'exam' ? '#EF4444' : a.type === 'quiz' ? '#8B5CF6' : '#3B82F6',
          is_auto: true,
          assessment_id: a._id.toString(),
        });
      }
      if (a.end_date) {
        assessmentEvents.push({
          id: `assessment-end-${a._id}`,
          title: `⏰ ${a.title} (Deadline)`,
          description: a.description || '',
          date: a.end_date,
          type: 'deadline',
          course_id: a.course_id,
          color: '#EF4444',
          is_auto: true,
          assessment_id: a._id.toString(),
        });
      }
    }

    // Filter assessment events by month/year if requested
    let filteredAssessmentEvents = assessmentEvents;
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filteredAssessmentEvents = assessmentEvents.filter(e => {
        const d = new Date(e.date);
        return d >= startDate && d <= endDate;
      });
    }

    // 3. Combine and sort
    const allEvents = [
      ...filteredCustomEvents.map(e => ({ ...e.toJSON(), is_auto: false })),
      ...filteredAssessmentEvents,
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allEvents);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── POST / — Create custom event (admin only) ────────────────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      created_by: req.user._id.toString(),
    });
    res.status(201).json(event.toJSON());
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /:id — Update event (admin only) ─────────────────────
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ detail: 'Event not found' });
    res.json(event.toJSON());
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid event ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── DELETE /:id — Delete event (admin only) ──────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ detail: 'Event not found' });
    res.json({ status: 'success', message: 'Event deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid event ID format' });
    res.status(500).json({ detail: err.message });
  }
});

export default router;
