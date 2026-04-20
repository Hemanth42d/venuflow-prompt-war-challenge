import { db } from './firebaseAdmin.js';
import admin from 'firebase-admin';
import { VENUE_ZONES, SEED_EVENTS } from './venueData.js';

const FieldValue = admin.firestore.FieldValue;

async function seed() {
  console.log('🌱 Seeding Firestore...');

  // Seed zones
  const zoneBatch = db.batch();
  for (const zone of VENUE_ZONES) {
    const ref = db.collection('zones').doc(zone.id);
    zoneBatch.set(ref, {
      ...zone,
      currentOccupancy: 0,
      crowdLevel: 'low',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await zoneBatch.commit();
  console.log(`  ✓ ${VENUE_ZONES.length} zones seeded`);

  // Seed events
  const eventBatch = db.batch();
  for (const event of SEED_EVENTS) {
    const ref = db.collection('events').doc(event.id);
    eventBatch.set(ref, {
      ...event,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await eventBatch.commit();
  console.log(`  ✓ ${SEED_EVENTS.length} events seeded`);

  // Update zone occupancy based on event attendees
  for (const event of SEED_EVENTS) {
    if (event.currentAttendees > 0) {
      const zoneRef = db.collection('zones').doc(event.zoneId);
      const zoneSnap = await zoneRef.get();
      if (zoneSnap.exists) {
        const zoneData = zoneSnap.data();
        const newOcc = (zoneData.currentOccupancy || 0) + event.currentAttendees;
        const ratio = newOcc / zoneData.capacity;
        let crowdLevel = 'low';
        if (ratio >= 0.85) crowdLevel = 'critical';
        else if (ratio >= 0.65) crowdLevel = 'high';
        else if (ratio >= 0.35) crowdLevel = 'moderate';

        await zoneRef.update({
          currentOccupancy: newOcc,
          crowdLevel,
        });
      }
    }
  }
  console.log('  ✓ Zone occupancy synced');

  // Seed initial alert
  await db.collection('alerts').add({
    type: 'info',
    title: 'System Online',
    message: 'VenueFlow real-time crowd tracking is now active.',
    timestamp: FieldValue.serverTimestamp(),
    read: false,
  });
  console.log('  ✓ Welcome alert created');

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
