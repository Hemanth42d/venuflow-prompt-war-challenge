/**
 * @fileoverview VenueFlow Express server entry point.
 * Configures middleware (CORS, Helmet, rate limiting), mounts API routes
 * (Firebase-backed or in-memory demo), and serves the frontend SPA in production.
 * @module server
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const USE_FIREBASE = process.env.USE_FIREBASE === 'true';

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

/**
 * Sanitizes a string value by trimming and removing HTML tags.
 * @param {string} val - The input string.
 * @returns {string} Sanitized string.
 */
function sanitize(val) {
  if (typeof val !== 'string') return val;
  return val.trim().replace(/<[^>]*>/g, '');
}

/**
 * Middleware that sanitizes all string fields in req.body for POST/PUT requests.
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  next();
}
app.use(sanitizeBody);

if (USE_FIREBASE) {
  // Firebase-backed routes
  const { eventRoutes } = await import('./routes/events.js');
  const { zoneRoutes } = await import('./routes/zones.js');
  const { navigationRoutes } = await import('./routes/navigation.js');
  const { analyticsRoutes } = await import('./routes/analytics.js');
  const { alertRoutes } = await import('./routes/alerts.js');

  app.use('/api/events', eventRoutes);
  app.use('/api/zones', zoneRoutes);
  app.use('/api/navigation', navigationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/alerts', alertRoutes);

  console.log('  Mode: Firebase');
} else {
  // Demo mode — in-memory store, no Firebase needed
  const { demoRoutes } = await import('./routes/demo.js');
  app.use('/api', demoRoutes);

  console.log('  Mode: Demo (in-memory)');
}

app.get('/api/health', (_, res) => res.json({ status: 'ok', mode: USE_FIREBASE ? 'firebase' : 'demo', uptime: process.uptime() }));

// Serve frontend static files in production
const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir));
// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏟️  VenueFlow running on http://localhost:${PORT}`);
});
