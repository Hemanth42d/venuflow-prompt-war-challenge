import { Router } from 'express';
import { db } from '../firebaseAdmin.js';

const router = Router();

// GET /api/analytics/summary — computed crowd analytics
router.get('/summary', async (req, res) => {
  try {
    const [eventsSnap, zonesSnap] = await Promise.all([
      db.collection('events').get(),
      db.collection('zones').get(),
    ]);

    const events = eventsSnap.docs.map((d) => d.data());
    const zones = zonesSnap.docs.map((d) => d.data());

    const totalAttendees = events.reduce((sum, e) => sum + (e.currentAttendees || 0), 0);
    const totalCapacity = events.reduce((sum, e) => sum + (e.maxCapacity || 0), 0);
    const liveEvents = events.filter((e) => e.status === 'live').length;
    const upcomingEvents = events.filter((e) => e.status === 'upcoming').length;

    const zoneSummary = zones.map((z) => ({
      id: z.id,
      name: z.name,
      type: z.type,
      occupancy: z.currentOccupancy || 0,
      capacity: z.capacity,
      crowdLevel: z.crowdLevel || 'low',
      utilization: z.capacity > 0 ? Math.round(((z.currentOccupancy || 0) / z.capacity) * 100) : 0,
    }));

    const criticalZones = zoneSummary.filter((z) => z.crowdLevel === 'critical' || z.crowdLevel === 'high');

    res.json({
      totalAttendees,
      totalCapacity,
      overallUtilization: totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0,
      liveEvents,
      upcomingEvents,
      totalEvents: events.length,
      criticalZones,
      zoneSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as analyticsRoutes };
