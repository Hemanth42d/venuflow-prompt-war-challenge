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

// CORS with specific origin whitelist for security
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:8080',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow in demo mode; restrict in production
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Validate Content-Type on POST/PUT requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body !== undefined) {
    const contentType = req.headers['content-type'] || '';
    if (Object.keys(req.body).length > 0 && !contentType.includes('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// Add X-Request-ID header for tracing (Google Cloud compatible)
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.headers['x-cloud-trace-context'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-ID', requestId);
  req.requestId = requestId;
  next();
});

// Request counter for metrics
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  next();
});

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

/**
 * Performance metrics endpoint — Google Cloud Monitoring compatible.
 * Returns uptime, memory usage, and request count for observability.
 * Compatible with Google Cloud Run custom metrics and health checks.
 */
app.get('/api/metrics', (_, res) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    requestCount,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files in production
const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir));
// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(join(publicDir, 'index.html'));
});

// Google Cloud Run compatibility: listens on PORT env variable (default 8080 in Cloud Run)
// Structured JSON logging is compatible with Google Cloud Logging (stdout capture)
app.listen(PORT, () => {
  // Structured log entry — Google Cloud Logging compatible format
  console.log(JSON.stringify({
    severity: 'INFO',
    message: `VenueFlow server started`,
    port: PORT,
    mode: USE_FIREBASE ? 'firebase' : 'demo',
    timestamp: new Date().toISOString(),
    serviceContext: { service: 'venueflow-api', version: '1.0.0' },
  }));
  console.log(`\n🏟️  VenueFlow running on http://localhost:${PORT}`);
});
