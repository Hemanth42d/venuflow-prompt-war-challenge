import { Router } from 'express';
import { db } from '../firebaseAdmin.js';

const router = Router();

// GET /api/zones — list all zones with live occupancy
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('zones').get();
    const zones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/zones/:id — single zone detail
router.get('/:id', async (req, res) => {
  try {
    const snap = await db.collection('zones').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Zone not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as zoneRoutes };
