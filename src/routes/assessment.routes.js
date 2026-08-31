import { Router } from 'express';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import Course from '../models/Course.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ══════════════════════════════════════════════════════════════
//  ADMIN & PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET / — List assessments ─────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { course_id, type, status } = req.query;
    const filter = {};

    if (course_id) filter.course_id = course_id;
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Students only see published assessments for their enrolled courses
    if (req.user.role === 'student') {
      filter.status = 'published';
      const userEnrolled = req.user.enrolled_courses || [];
      const validObjectIds = userEnrolled.filter(id => id && /^[0-9a-fA-F]{24}$/.test(String(id)));
      
      const matchingCourses = await Course.find({
        $or: [
          { project_id: { $in: userEnrolled } },
          { _id: { $in: validObjectIds } },
          { enrolled_students: req.user._id.toString() }
        ]
      }).select('_id project_id');

      const allCourseAliases = new Set(userEnrolled.map(String));
      matchingCourses.forEach(c => {
        if (c.project_id) allCourseAliases.add(c.project_id);
        if (c._id) allCourseAliases.add(c._id.toString());
      });

      const enrolledList = Array.from(allCourseAliases);
      if (enrolledList.length > 0) {
        filter.course_id = { $in: enrolledList };
      } else {
        return res.json([]);
      }
    }

    const assessments = await Assessment.find(filter).sort({ created_at: -1 });

    // For students, also fetch their submission status
    if (req.user.role === 'student') {
      const studentId = req.user._id.toString();
      const submissions = await Submission.find({
        student_id: studentId,
        assessment_id: { $in: assessments.map(a => a._id) },
      });

      const submissionMap = {};
      submissions.forEach(s => {
        submissionMap[s.assessment_id.toString()] = s.toJSON();
      });

      const enriched = assessments.map(a => ({
        ...a.toJSON(),
        submission: submissionMap[a._id.toString()] || null,
        is_submitted: !!submissionMap[a._id.toString()],
      }));

      return res.json(enriched);
    }

    res.json(assessments.map(a => a.toJSON()));
  } catch (err) {
    console.error('List assessments error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /student/me — Current student's all submissions (MUST be defined before /:id)
router.get('/student/me', authenticate, async (req, res) => {
  try {
    const submissions = await Submission.find({
      student_id: req.user._id.toString(),
    }).sort({ submitted_at: -1 });

    // Also populate assessment info
    const assessmentIds = [...new Set(submissions.map(s => s.assessment_id))];
    const assessments = await Assessment.find({ _id: { $in: assessmentIds } });
    const assessmentMap = {};
    assessments.forEach(a => { assessmentMap[a._id.toString()] = a.toJSON(); });

    const enriched = submissions.map(s => ({
      ...s.toJSON(),
      assessment: assessmentMap[s.assessment_id.toString()] || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /student/:studentId — Admin/Superadmin view specific student submissions ──
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const isElevated = ['superadmin', 'admin'].includes(req.user.role);
    if (!isElevated && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).json({ detail: 'Admin access required to view student submissions' });
    }

    const submissions = await Submission.find({
      student_id: req.params.studentId,
    }).sort({ submitted_at: -1 });

    const assessmentIds = [...new Set(submissions.map(s => s.assessment_id))];
    const assessments = await Assessment.find({ _id: { $in: assessmentIds } });
    const assessmentMap = {};
    assessments.forEach(a => { assessmentMap[a._id.toString()] = a.toJSON(); });

    const enriched = submissions.map(s => ({
      ...s.toJSON(),
      assessment: assessmentMap[s.assessment_id.toString()] || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /:id — Get single assessment ─────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });

    // Students cannot view draft assessments
    if (req.user.role === 'student') {
      if (assessment.status !== 'published') {
        return res.status(403).json({ detail: 'Assessment is not accessible' });
      }
      
      const userEnrolled = req.user.enrolled_courses || [];
      const validObjectIds = userEnrolled.filter(id => id && /^[0-9a-fA-F]{24}$/.test(String(id)));
      
      const matchingCourse = await Course.findOne({
        $and: [
          {
            $or: [
              { project_id: assessment.course_id },
              { _id: String(assessment.course_id).match(/^[0-9a-fA-F]{24}$/) ? assessment.course_id : null }
            ]
          },
          {
            $or: [
              { project_id: { $in: userEnrolled } },
              { _id: { $in: validObjectIds } },
              { enrolled_students: req.user._id.toString() }
            ]
          }
        ]
      });

      const isDirectlyEnrolled = userEnrolled.some(c => c.toString() === assessment.course_id?.toString());
      if (!matchingCourse && !isDirectlyEnrolled) {
        return res.status(403).json({ detail: 'You must be enrolled in the course to access this assessment' });
      }
    }

    // Check start date for students
    if (req.user.role === 'student' && assessment.start_date && new Date() < new Date(assessment.start_date)) {
      return res.status(403).json({ detail: 'Assessment has not started yet' });
    }

    const result = assessment.toJSON();

    // If student, check submission and strip correct answers for unsubmitted exams
    if (req.user.role === 'student') {
      const submission = await Submission.findOne({
        assessment_id: assessment._id,
        student_id: req.user._id.toString(),
      });

      result.submission = submission ? submission.toJSON() : null;
      result.is_submitted = !!submission;

      // For exams/quizzes that haven't been submitted, hide correct answers & explanations
      if (!submission && ['quiz', 'exam'].includes(assessment.type)) {
        result.questions = (result.questions || []).map(q => {
          const cleanQ = typeof q.toObject === 'function' ? q.toObject() : { ...q };
          delete cleanQ.correct_answer;
          delete cleanQ.explanation;
          return cleanQ;
        });
      }
    }

    res.json(result);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid assessment ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── POST / — Create assessment (admin only) ──────────────────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = {
      ...req.body,
      created_by: req.user._id.toString(),
    };

    // Auto-calculate total_marks from questions
    if (data.questions?.length) {
      data.total_marks = data.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
    }

    const assessment = await Assessment.create(data);
    res.status(201).json(assessment.toJSON());
  } catch (err) {
    console.error('Create assessment error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /:id — Update assessment (admin only) ────────────────
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = req.body;

    if (data.questions?.length) {
      data.total_marks = data.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
    }

    const assessment = await Assessment.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });
    res.json(assessment.toJSON());
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid assessment ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── DELETE /:id — Delete assessment (admin only) ─────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndDelete(req.params.id);
    if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });

    // Also delete related submissions
    await Submission.deleteMany({ assessment_id: req.params.id });

    res.json({ status: 'success', message: 'Assessment deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid assessment ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── PATCH /:id/publish or /:id/status — Publish/Unpublish ─────────
router.patch(['/:id/publish', '/:id/status'], authenticate, requireAdmin, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });

    const newStatus = req.body?.status || (assessment.status === 'published' ? 'draft' : 'published');
    assessment.status = newStatus;
    await assessment.save();

    res.json({ status: 'success', new_status: newStatus, assessment: assessment.toJSON() });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid assessment ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  STUDENT SUBMISSION ROUTES
// ══════════════════════════════════════════════════════════════

// ── POST /:id/submit — Student submits answers ───────────────
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });

    if (assessment.status !== 'published') {
      return res.status(400).json({ detail: 'Assessment is not published' });
    }

    if (assessment.start_date && new Date() < new Date(assessment.start_date)) {
      return res.status(400).json({ detail: 'Assessment has not started yet' });
    }

    if (req.user.role === 'student') {
      const userEnrolled = req.user.enrolled_courses || [];
      const validObjectIds = userEnrolled.filter(id => id && /^[0-9a-fA-F]{24}$/.test(String(id)));
      
      const matchingCourse = await Course.findOne({
        $and: [
          {
            $or: [
              { project_id: assessment.course_id },
              { _id: String(assessment.course_id).match(/^[0-9a-fA-F]{24}$/) ? assessment.course_id : null }
            ]
          },
          {
            $or: [
              { project_id: { $in: userEnrolled } },
              { _id: { $in: validObjectIds } },
              { enrolled_students: req.user._id.toString() }
            ]
          }
        ]
      });

      const isDirectlyEnrolled = userEnrolled.some(c => c.toString() === assessment.course_id?.toString());
      if (!matchingCourse && !isDirectlyEnrolled) {
        return res.status(403).json({ detail: 'You must be enrolled in the course to submit this assessment' });
      }
    }

    const studentId = req.user._id.toString();

    // Check submission attempts limit
    const attemptCount = await Submission.countDocuments({
      assessment_id: assessment._id,
      student_id: studentId,
    });

    const maxAttempts = assessment.max_attempts || 1;
    if (maxAttempts > 0 && attemptCount >= maxAttempts) {
      return res.status(400).json({ detail: 'Maximum submission attempts reached' });
    }

    // Auto-grade MCQ and true/false with robust index & letter normalization
    let score = 0;
    const answers = req.body?.answers || {};

    if (['quiz', 'exam'].includes(assessment.type)) {
      assessment.questions.forEach((q, idx) => {
        const studentAnswer = answers[String(idx)] ?? answers[q.question];
        if (studentAnswer !== undefined && studentAnswer !== null) {
          const normStudent = typeof studentAnswer === 'number' ? ['A', 'B', 'C', 'D'][studentAnswer] : String(studentAnswer).trim().toUpperCase();
          const normCorrect = typeof q.correct_answer === 'number' ? ['A', 'B', 'C', 'D'][q.correct_answer] : String(q.correct_answer || '').trim().toUpperCase();

          if (normStudent === normCorrect || String(studentAnswer).trim() === String(q.correct_answer).trim()) {
            score += q.marks || 1;
          }
        }
      });
    }

    const totalMarks = assessment.total_marks || assessment.questions.length || 100;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    // Check if late
    let submissionStatus = 'submitted';
    if (assessment.end_date && new Date() > new Date(assessment.end_date)) {
      submissionStatus = 'late';
    }

    // For auto-gradable types, mark as graded
    if (['quiz', 'exam'].includes(assessment.type)) {
      submissionStatus = 'graded';
    }

    const submission = await Submission.create({
      assessment_id: assessment._id,
      student_id: studentId,
      student_name: req.user.name,
      student_email: req.user.email,
      answers,
      score: ['quiz', 'exam'].includes(assessment.type) ? score : null,
      total_marks: totalMarks,
      percentage: ['quiz', 'exam'].includes(assessment.type) ? percentage : null,
      time_taken: req.body?.time_taken || 0,
      status: submissionStatus,
      files: req.body?.files || [],
    });

    res.status(201).json(submission.toJSON());
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid assessment ID format' });
    console.error('Submit error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /:id/submissions — All submissions for an assessment (admin) ──
router.get('/:id/submissions', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find({
      assessment_id: req.params.id,
    }).sort({ submitted_at: -1 });

    res.json(submissions.map(s => s.toJSON()));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid assessment ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── PATCH /:assessmentId/submissions/:submissionId/grade — Grade submission (admin) ──
router.patch('/:assessmentId/submissions/:submissionId/grade', authenticate, requireAdmin, async (req, res) => {
  try {
    const { score, feedback } = req.body || {};

    if (score === undefined || score === null || typeof score !== 'number' || isNaN(score) || score < 0) {
      return res.status(400).json({ detail: 'Score must be a valid non-negative number' });
    }

    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ detail: 'Submission not found' });

    submission.score = score;
    submission.feedback = typeof feedback === 'string' ? feedback : '';
    submission.percentage = submission.total_marks > 0 ? Math.min(100, Math.max(0, Math.round((score / submission.total_marks) * 100))) : 0;
    submission.status = 'graded';
    submission.graded_by = req.user._id.toString();
    await submission.save();

    res.json(submission.toJSON());
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid ID format' });
    res.status(500).json({ detail: err.message });
  }
});

export default router;
