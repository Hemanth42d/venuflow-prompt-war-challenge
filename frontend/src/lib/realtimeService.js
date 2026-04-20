import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { getEvents, getZones } from './api';

const isFirebaseConfigured =
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'demo-project';

// ── Firebase real-time listeners (used when Firebase is configured) ──
function firebaseSubscribeToEvents(callback) {
  const q = query(collection(db, 'events'), orderBy('startTime'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

function firebaseSubscribeToZones(callback) {
  return onSnapshot(collection(db, 'zones'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

function firebaseSubscribeToAlerts(callback) {
  const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ── Polling fallback (demo mode — polls backend API) ──
function pollingSubscribe(fetchFn, callback, intervalMs = 2000) {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const data = await fetchFn();
      if (active) callback(data);
    } catch (err) {
      // silent — backend might not be up yet
    }
    if (active) setTimeout(poll, intervalMs);
  };

  poll();
  return () => { active = false; };
}

async function fetchAlerts() {
  const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/alerts`);
  return res.json();
}

// ── Exported subscriptions — auto-detect mode ──
export function subscribeToEvents(callback) {
  if (isFirebaseConfigured) return firebaseSubscribeToEvents(callback);
  return pollingSubscribe(getEvents, callback);
}

export function subscribeToZones(callback) {
  if (isFirebaseConfigured) return firebaseSubscribeToZones(callback);
  return pollingSubscribe(getZones, callback);
}

export function subscribeToAlerts(callback) {
  if (isFirebaseConfigured) return firebaseSubscribeToAlerts(callback);
  return pollingSubscribe(fetchAlerts, callback, 3000);
}
