import { Router } from 'express';
import { db } from '../firebaseAdmin.js';

const router = Router();

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('alerts').orderBy('timestamp', 'desc').limit(50).get();
    const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await db.collection('alerts').doc(req.params.id).update({ read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as alertRoutes };
