import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── POST /register ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      !name || typeof name !== 'string' || !name.trim() ||
      !email || typeof email !== 'string' || !email.trim() ||
      !password || typeof password !== 'string' || !password.trim()
    ) {
      return res.status(400).json({ detail: 'Name, email, and password must be valid non-empty strings' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const password_hash = await User.hashPassword(password);
    // Public registration ALWAYS creates student accounts to prevent role escalation
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password_hash,
      role: 'student',
    });

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
    );

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Registration failed' });
  }
});

// ── POST /login ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !email || typeof email !== 'string' || !email.trim() ||
      !password || typeof password !== 'string' || !password.trim()
    ) {
      return res.status(400).json({ detail: 'Email and password must be valid non-empty strings' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
    );

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Login failed' });
  }
});

// ── GET /me ──────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

export default router;
