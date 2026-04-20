import { Router } from 'express';
import { db } from '../firebaseAdmin.js';
import admin from 'firebase-admin';

const router = Router();
const FieldValue = admin.firestore.FieldValue;

function getCrowdLevel(occupancy, capacity) {
  const ratio = occupancy / capacity;
  if (ratio >= 0.85) return 'critical';
  if (ratio >= 0.65) return 'high';
  if (ratio >= 0.35) return 'moderate';
  return 'low';
}

// GET /api/events — list all events
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('events').orderBy('startTime').get();
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/enter — attendee enters event
router.post('/:id/enter', async (req, res) => {
  try {
    const eventRef = db.collection('events').doc(req.params.id);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) return res.status(404).json({ error: 'Event not found' });

    const data = eventSnap.data();
    if (data.currentAttendees >= data.maxCapacity) {
      return res.status(409).json({ error: 'Event is at full capacity' });
    }

    // Update event attendees
    const newAttendees = data.currentAttendees + 1;
    await eventRef.update({
      currentAttendees: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update zone occupancy
    const zoneRef = db.collection('zones').doc(data.zoneId);
    const zoneSnap = await zoneRef.get();
    if (zoneSnap.exists) {
      const zoneData = zoneSnap.data();
      const newOccupancy = (zoneData.currentOccupancy || 0) + 1;
      const crowdLevel = getCrowdLevel(newOccupancy, zoneData.capacity);

      await zoneRef.update({
        currentOccupancy: FieldValue.increment(1),
        crowdLevel,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Auto-alert on high crowd
      if (crowdLevel === 'critical' || crowdLevel === 'high') {
        await db.collection('alerts').add({
          type: crowdLevel === 'critical' ? 'danger' : 'warning',
          title: `${zoneData.name} — ${crowdLevel.toUpperCase()} crowd`,
          message: `Occupancy at ${Math.round((newOccupancy / zoneData.capacity) * 100)}% (${newOccupancy}/${zoneData.capacity}).`,
          timestamp: FieldValue.serverTimestamp(),
          read: false,
        });
      }
    }

    res.json({
      success: true,
      currentAttendees: newAttendees,
      message: `Entered ${data.name}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/leave — attendee leaves event
router.post('/:id/leave', async (req, res) => {
  try {
    const eventRef = db.collection('events').doc(req.params.id);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) return res.status(404).json({ error: 'Event not found' });

    const data = eventSnap.data();
    if (data.currentAttendees <= 0) {
      return res.status(400).json({ error: 'No attendees to remove' });
    }

    await eventRef.update({
      currentAttendees: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update zone
    const zoneRef = db.collection('zones').doc(data.zoneId);
    const zoneSnap = await zoneRef.get();
    if (zoneSnap.exists) {
      const zoneData = zoneSnap.data();
      const newOccupancy = Math.max(0, (zoneData.currentOccupancy || 0) - 1);
      const crowdLevel = getCrowdLevel(newOccupancy, zoneData.capacity);

      await zoneRef.update({
        currentOccupancy: FieldValue.increment(-1),
        crowdLevel,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.json({
      success: true,
      currentAttendees: Math.max(0, data.currentAttendees - 1),
      message: `Left ${data.name}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as eventRoutes };
