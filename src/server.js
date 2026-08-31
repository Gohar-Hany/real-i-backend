import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import courseRoutes from './routes/course.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import eventRoutes from './routes/event.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import meetingRoutes from './routes/meeting.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & Middleware ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.up\.railway\.app$/.test(origin) ||
      /\.ngrok-free\.dev$/.test(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));

// Rate limiter for authentication endpoints (prevents brute-force / credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/meetings', meetingRoutes);

// ── Health Check ─────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REAL_i Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  // Handle invalid JSON body syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ detail: 'Malformed JSON payload' });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({ detail: `Invalid format for field: ${err.path}` });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    return res.status(400).json({ detail: err.message });
  }

  console.error('❌ Uncaught Error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    detail: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start Server ─────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 REAL_i API Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
