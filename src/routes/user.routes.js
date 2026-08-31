import { Router } from 'express';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import Course from '../models/Course.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET / — List all users (admin or superadmin only) ─────────
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').sort({ created_at: -1 });
    res.json(users.map(u => u.toJSON()));
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /:id — Get single user (admin, superadmin, or self) ────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const isElevated = ['superadmin', 'admin'].includes(req.user.role);
    if (!isElevated && currentUserId !== req.params.id) {
      return res.status(403).json({ detail: 'Admin access required or you must be the account owner' });
    }
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json(user.toJSON());
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid user ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /:id/role — Change user role (Super Admin only) ───────
router.put('/:id/role', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!['superadmin', 'admin', 'student', 'instructor'].includes(role)) {
      return res.status(400).json({ detail: "Role must be 'superadmin', 'admin', 'instructor', or 'student'" });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ detail: 'Cannot change your own role to prevent lockout' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password_hash');

    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json({ status: 'success', user_id: user._id.toString(), new_role: role });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid user ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── PUT /:id/profile — Update own profile ────────────────────
router.put('/:id/profile', authenticate, async (req, res) => {
  try {
    // Users can only update their own profile, unless elevated admin
    if (req.params.id !== req.user._id.toString() && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Cannot update another user\'s profile' });
    }

    const updates = {};
    const { name, avatar, password } = req.body || {};
    if (name && typeof name === 'string') updates.name = name.trim();
    if (avatar !== undefined) updates.avatar = avatar;
    if (password && typeof password === 'string' && password.trim()) {
      updates.password_hash = await User.hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password_hash');

    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json({ user: user.toJSON() });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid user ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── GET /:id/results — Get student quiz results (admin) ──────
router.get('/:id/results', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find({ student_id: req.params.id }).sort({ submitted_at: -1 });
    res.json({
      user_id: req.params.id,
      results: submissions.map(s => s.toJSON()),
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid user ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── POST /:id/lessons/:lessonId/toggle — Toggle lesson completion
router.post('/:id/lessons/:lessonId/toggle', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString() && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Cannot update another user\'s progress' });
    }

    const { id, lessonId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ detail: 'User not found' });

    if (req.user.role === 'student') {
      let course = null;
      if (req.body?.courseId) {
        course = await Course.findOne({
          $or: [
            { project_id: req.body.courseId },
            { _id: String(req.body.courseId).match(/^[0-9a-fA-F]{24}$/) ? req.body.courseId : null }
          ]
        });
      }
      if (!course) {
        course = await Course.findOne({ "modules.lessons.id": lessonId });
      }
      if (!course) return res.status(404).json({ detail: 'Lesson not found in any course' });
      
      const enrolled = user.enrolled_courses || [];
      const isEnrolled = enrolled.includes(course.project_id) ||
                         enrolled.includes(course._id.toString()) ||
                         (course.enrolled_students && course.enrolled_students.includes(user._id.toString()));

      if (!isEnrolled) {
        return res.status(403).json({ detail: 'You must be enrolled in the course to complete its lessons' });
      }
    }

    const completed = user.completed_lessons || [];
    const index = completed.indexOf(lessonId);
    const isNowCompleted = index === -1;
    
    if (index > -1) {
      completed.splice(index, 1); // unmark
    } else {
      completed.push(lessonId); // mark
    }

    user.completed_lessons = completed;
    await user.save();

    res.json({
      status: 'success',
      completed: isNowCompleted,
      is_completed: isNowCompleted,
      completed_lessons: user.completed_lessons
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid ID format' });
    res.status(500).json({ detail: err.message });
  }
});

// ── DELETE /:id — Delete a user (super admin only) ───────────
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ detail: 'Cannot delete your own account' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ detail: 'User not found' });

    // Safeguard: only another superadmin can delete a superadmin
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ detail: 'Cannot delete a Super Admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ student_id: req.params.id });

    res.json({ status: 'success', message: 'User deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ detail: 'Invalid user ID format' });
    res.status(500).json({ detail: err.message });
  }
});

export default router;
