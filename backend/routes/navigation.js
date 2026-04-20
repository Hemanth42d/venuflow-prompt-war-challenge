import { Router } from 'express';
import { db } from '../firebaseAdmin.js';

const router = Router();

// Venue graph — walking time in seconds between zones
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
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  if (path[0] !== start) return { path: [], time: Infinity };
  return { path, time: distances[end] };
}

// POST /api/navigation/route — compute shortest path with crowd-aware info
router.post('/route', async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    if (!VENUE_GRAPH[from]) return res.status(400).json({ error: `Unknown zone: ${from}` });
    if (!VENUE_GRAPH[to]) return res.status(400).json({ error: `Unknown zone: ${to}` });

    const result = dijkstra(VENUE_GRAPH, from, to);

    if (result.path.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }

    // Fetch live crowd data for zones along the path
    const zoneSnaps = await Promise.all(
      result.path.map((zId) => db.collection('zones').doc(zId).get())
    );

    const steps = result.path.map((zId, i) => {
      const zoneData = zoneSnaps[i].exists ? zoneSnaps[i].data() : {};
      const nextZone = result.path[i + 1];
      const segmentTime = nextZone ? (VENUE_GRAPH[zId]?.[nextZone] || 0) : 0;

      return {
        zoneId: zId,
        zoneName: zoneData.name || zId,
        crowdLevel: zoneData.crowdLevel || 'low',
        occupancy: zoneData.currentOccupancy || 0,
        capacity: zoneData.capacity || 0,
        segmentTime,
      };
    });

    // Crowd-adjusted time (add delay for crowded zones)
    let adjustedTime = result.time;
    for (const step of steps) {
      if (step.crowdLevel === 'critical') adjustedTime += 60;
      else if (step.crowdLevel === 'high') adjustedTime += 30;
    }

    const hasCrowdedSegments = steps.some((s) => s.crowdLevel === 'critical' || s.crowdLevel === 'high');

    res.json({
      from,
      to,
      path: result.path,
      steps,
      estimatedTime: result.time,
      adjustedTime,
      hasCrowdedSegments,
      recommendation: hasCrowdedSegments
        ? 'Route passes through crowded areas. Consider waiting or using an alternate path.'
        : 'Route is clear. Enjoy your walk!',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as navigationRoutes };
