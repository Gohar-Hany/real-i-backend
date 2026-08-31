import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authenticate any logged-in user (admin or student).
 * Attaches `req.user` with the full user document (minus password).
 * Strictly validates Bearer token structure and enforces HS256 algorithm.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      return res.status(401).json({ detail: 'Invalid token format' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ detail: 'Invalid token payload' });
    }

    const user = await User.findById(decoded.sub).select('-password_hash');
    if (!user) {
      return res.status(401).json({ detail: 'User not found or account deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token expired' });
    }
    return res.status(401).json({ detail: 'Invalid token' });
  }
};

/**
 * Require admin role. Must be used AFTER `authenticate`.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
};

