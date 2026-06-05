import { Router } from 'express';
import * as demo from '../demoStore.js';
import { getIntelligence } from '../intelligence.js';

const router = Router();

// ── Intelligence ──
router.get('/intelligence', (req, res) => {
  res.json(getIntelligence());
});

// ── Events ──
router.get('/events', (req, res) => {
  res.json(demo.getEvents());
});

router.post('/events/:id/enter', (req, res) => {
  try {
    const result = demo.enterEvent(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('capacity') ? 409 : 404).json({ error: err.message });
  }
});

router.post('/events/:id/leave', (req, res) => {
  try {
    const result = demo.leaveEvent(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Zones ──
router.get('/zones', (req, res) => {
  res.json(demo.getZones());
});

router.get('/zones/:id', (req, res) => {
  const zone = demo.getZone(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json(zone);
});

// ── Navigation ──
const VENUE_GRAPH = {
  'gate-1': { 'north-concourse': 30 },
  'gate-2': { 'north-concourse': 30 },
  'gate-3': { 'south-concourse': 30 },
  'gate-4': { 'south-concourse': 30 },
  'north-concourse': { 'gate-1': 30, 'gate-2': 30, 'main-stadium': 60, 'food-court-a': 45, 'south-concourse': 180 },
  'south-concourse': { 'gate-3': 30, 'gate-4': 30, 'main-stadium': 60, 'food-court-b': 45, 'north-concourse': 180 },
  'main-stadium': { 'north-concourse': 60, 'south-concourse': 60, 'east-gate': 90, 'west-gate': 90 },
  'east-gate': { 'main-stadium': 90, 'parking-east': 45, 'merch-store': 30, 'food-court-a': 60, 'food-court-b': 60 },
  'west-gate': { 'main-stadium': 90, 'parking-west': 45, 'first-aid': 30 },
  'food-court-a': { 'north-concourse': 45, 'east-gate': 60 },
  'food-court-b': { 'south-concourse': 45, 'east-gate': 60 },
  'merch-store': { 'east-gate': 30 },
  'first-aid': { 'west-gate': 30 },
  'parking-east': { 'east-gate': 45 },
  'parking-west': { 'west-gate': 45 },
};

function dijkstra(graph, start, end) {
  if (start === end) return { path: [start], time: 0 };
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  for (const node of Object.keys(graph)) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  }
  distances[start] = 0;
  while (unvisited.size > 0) {
    let current = null;
    for (const node of unvisited) {
      if (current === null || distances[node] < distances[current]) current = node;
    }
    if (current === end || distances[current] === Infinity) break;
    unvisited.delete(current);
    for (const [neighbor, weight] of Object.entries(graph[current] || {})) {
      const alt = distances[current] + weight;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }
  const path = [];
  let current = end;
  while (current) { path.unshift(current); current = previous[current]; }
  if (path[0] !== start) return { path: [], time: Infinity };
  return { path, time: distances[end] };
}

router.post('/navigation/route', (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  if (!VENUE_GRAPH[from]) return res.status(400).json({ error: `Unknown zone: ${from}` });
  if (!VENUE_GRAPH[to]) return res.status(400).json({ error: `Unknown zone: ${to}` });

  const result = dijkstra(VENUE_GRAPH, from, to);
  if (result.path.length === 0) return res.status(404).json({ error: 'No route found' });

  const zones = demo.getZones();
  const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z]));

  const steps = result.path.map((zId, i) => {
    const z = zoneMap[zId] || {};
    const nextZone = result.path[i + 1];
    const segmentTime = nextZone ? (VENUE_GRAPH[zId]?.[nextZone] || 0) : 0;
    return {
      zoneId: zId,
      zoneName: z.name || zId,
      crowdLevel: z.crowdLevel || 'low',
      occupancy: z.currentOccupancy || 0,
      capacity: z.capacity || 0,
      segmentTime,
    };
  });

  let adjustedTime = result.time;
  for (const step of steps) {
    if (step.crowdLevel === 'critical') adjustedTime += 60;
    else if (step.crowdLevel === 'high') adjustedTime += 30;
  }
  const hasCrowdedSegments = steps.some((s) => s.crowdLevel === 'critical' || s.crowdLevel === 'high');

  res.json({
    from, to,
    path: result.path,
    steps,
    estimatedTime: result.time,
    adjustedTime,
    hasCrowdedSegments,
    recommendation: hasCrowdedSegments
      ? 'Route passes through crowded areas. Consider waiting or using an alternate path.'
      : 'Route is clear. Enjoy your walk!',
  });
});

// ── Analytics ──
router.get('/analytics/summary', (req, res) => {
  res.json(demo.getAnalyticsSummary());
});

// ── Alerts ──
router.get('/alerts', (req, res) => {
  res.json(demo.getAlerts());
});

router.patch('/alerts/:id/read', (req, res) => {
  res.json(demo.markAlertRead(req.params.id));
});

const VALID_IDS = {
  'VENUE-OPS-001': { role: 'Operations', level: 'admin' },
  'ADMIN-2026': { role: 'Administrator', level: 'admin' },
  'STAFF-ALPHA': { role: 'Staff', level: 'staff' },
  'DEMO-ACCESS': { role: 'Demo User', level: 'demo' },
  'SUPERADMIN': { role: 'Super Admin', level: 'superadmin' },
};

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.substring(7).trim().toUpperCase();
  const match = VALID_IDS[token];
  if (!match || (match.level !== 'admin' && match.level !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  req.user = { accessId: token, ...match };
  next();
}

// ── Admin: Events CRUD ──
router.post('/admin/events', requireAdmin, (req, res) => {
  try { res.json(demo.createEvent(req.body)); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/admin/events/:id', requireAdmin, (req, res) => {
  try { res.json(demo.updateEvent(req.params.id, req.body)); }
  catch (err) { res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message }); }
});

router.delete('/admin/events/:id', requireAdmin, (req, res) => {
  try { res.json(demo.deleteEvent(req.params.id)); }
  catch (err) { res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message }); }
});

// ── Admin: Zones CRUD ──
router.post('/admin/zones', requireAdmin, (req, res) => {
  try { res.json(demo.createZone(req.body)); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/admin/zones/:id', requireAdmin, (req, res) => {
  try { res.json(demo.updateZone(req.params.id, req.body)); }
  catch (err) { res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message }); }
});

router.delete('/admin/zones/:id', requireAdmin, (req, res) => {
  try { res.json(demo.deleteZone(req.params.id)); }
  catch (err) { res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message }); }
});

export { router as demoRoutes };
