import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const USE_FIREBASE = process.env.USE_FIREBASE === 'true';

app.use(cors());
app.use(express.json());

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
