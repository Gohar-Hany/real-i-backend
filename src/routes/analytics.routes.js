import { Router } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET /overview — Platform-wide analytics (admin only) ─────
router.get('/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalStudents, totalAdmins, totalCourses, totalAssessments, totalSubmissions] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'admin' }),
        Course.countDocuments(),
        Assessment.countDocuments(),
        Submission.countDocuments(),
      ]);

    // Average score
    const scoreAgg = await Submission.aggregate([
      { $match: { percentage: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$percentage' } } },
    ]);
    const avgScore = scoreAgg.length > 0 ? Math.round(scoreAgg[0].avgScore) : 0;

    // Score distribution
    const dist = await Submission.aggregate([
      { $match: { percentage: { $ne: null } } },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 60, 75, 90, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const scoreDistribution = { poor: 0, average: 0, good: 0, excellent: 0 };
    dist.forEach(d => {
      if (d._id === 0) scoreDistribution.poor = d.count;
      else if (d._id === 60) scoreDistribution.average = d.count;
      else if (d._id === 75) scoreDistribution.good = d.count;
      else if (d._id === 90) scoreDistribution.excellent = d.count;
    });

    // Assessments by type
    const typeAgg = await Assessment.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const assessmentsByType = {};
    typeAgg.forEach(t => { assessmentsByType[t._id] = t.count; });

    res.json({
      totalUsers,
      totalStudents,
      totalAdmins,
      totalCourses,
      totalAssessments,
      totalSubmissions,
      avgScore,
      scoreDistribution,
      assessmentsByType,
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /students — Per-student performance (admin only) ─────
router.get('/students', authenticate, requireAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password_hash');
    const submissions = await Submission.find({ percentage: { $ne: null } });

    const studentMap = {};
    submissions.forEach(s => {
      const sId = s.student_id ? s.student_id.toString() : '';
      if (!sId) return;
      if (!studentMap[sId]) {
        studentMap[sId] = { total: 0, sum: 0, count: 0, best: 0, passed: 0 };
      }
      studentMap[sId].total++;
      studentMap[sId].sum += s.percentage;
      studentMap[sId].count++;
      if (s.percentage > studentMap[sId].best) {
        studentMap[sId].best = s.percentage;
      }
      if (s.percentage >= 60) {
        studentMap[sId].passed++;
      }
    });

    const result = students.map(s => {
      const sId = s._id ? s._id.toString() : (s.id ? s.id.toString() : '');
      const data = studentMap[sId] || { total: 0, sum: 0, count: 0, best: 0, passed: 0 };
      const avg = data.count > 0 ? Math.round(data.sum / data.count) : 0;
      const passRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;

      return {
        ...s.toJSON(),
        quizzes_taken: data.total,
        avg_score: avg,
        best_score: data.best,
        pass_rate: passRate,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /courses/:id — Per-course analytics (admin only) ─────
router.get('/courses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const course = await Course.findOne({ project_id: req.params.id });
    if (!course) return res.status(404).json({ detail: 'Course not found' });

    const assessments = await Assessment.find({ course_id: req.params.id });
    const assessmentIds = assessments.map(a => a._id);

    const submissions = await Submission.find({
      assessment_id: { $in: assessmentIds },
    });

    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.percentage != null);
    const avgScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((acc, s) => acc + s.percentage, 0) / gradedSubmissions.length)
      : 0;

    res.json({
      course: course.toJSON(),
      totalAssessments: assessments.length,
      totalSubmissions,
      avgScore,
      enrolledStudents: course.enrolled_students.length,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
