/**
 * @fileoverview In-memory demo data store for VenueFlow.
 * Provides a zero-configuration runtime store with CRUD operations for events,
 * zones, alerts, and analytics. Used as the default mode when Firebase is not
 * configured. Initializes with seed data (8 events, 15 zones, 7 alerts).
 * @module demoStore
 */
import { VENUE_ZONES, SEED_EVENTS } from './venueData.js';

function getCrowdLevel(occupancy, capacity) {
  const ratio = occupancy / capacity;
  if (ratio >= 0.85) return 'critical';
  if (ratio >= 0.65) return 'high';
  if (ratio >= 0.35) return 'moderate';
  return 'low';
}

// Initialize zones with occupancy from seed events
function buildInitialZones() {
  const zoneOccupancy = {};
  for (const evt of SEED_EVENTS) {
    if (evt.currentAttendees > 0) {
      zoneOccupancy[evt.zoneId] = (zoneOccupancy[evt.zoneId] || 0) + evt.currentAttendees;
    }
  }

  return VENUE_ZONES.map((z) => {
    const occ = zoneOccupancy[z.id] || 0;
    return {
      ...z,
      currentOccupancy: occ,
      crowdLevel: getCrowdLevel(occ, z.capacity),
      updatedAt: new Date().toISOString(),
    };
  });
}

let alertIdCounter = 8;

const now = Math.floor(Date.now() / 1000);

const store = {
  events: SEED_EVENTS.map((e) => ({ ...e, updatedAt: new Date().toISOString() })),
  zones: buildInitialZones(),
  alerts: [
    {
      id: 'alert-1',
      type: 'danger',
      title: 'Main Stadium — CRITICAL crowd',
      message: 'Occupancy at 68% capacity (3420/5000). Staff dispatched to manage flow.',
      timestamp: { seconds: now - 120 },
      read: false,
    },
    {
      id: 'alert-2',
      type: 'warning',
      title: 'Food Court A — HIGH crowd',
      message: 'Occupancy at 36% capacity (287/800). Wait times increasing.',
      timestamp: { seconds: now - 600 },
      read: false,
    },
    {
      id: 'alert-3',
      type: 'info',
      title: 'Championship Finals — Kickoff',
      message: 'The main event has started. Expect increased movement in North Concourse.',
      timestamp: { seconds: now - 1800 },
      read: false,
    },
    {
      id: 'alert-4',
      type: 'warning',
      title: 'Merchandise Store — HIGH crowd',
      message: 'Limited edition merch causing queue buildup. Occupancy at 39% (156/400).',
      timestamp: { seconds: now - 2400 },
      read: false,
    },
    {
      id: 'alert-5',
      type: 'success',
      title: 'South Concourse — Cleared',
      message: 'Crowd levels returned to normal after Tennis Exhibition ended.',
      timestamp: { seconds: now - 3600 },
      read: true,
    },
    {
      id: 'alert-6',
      type: 'info',
      title: 'System Online',
      message: 'VenueFlow real-time crowd tracking is now active. All systems operational.',
      timestamp: { seconds: now - 7200 },
      read: true,
    },
    {
      id: 'alert-7',
      type: 'info',
      title: 'Weather Advisory',
      message: 'Clear skies expected. Outdoor zones are fully operational.',
      timestamp: { seconds: now - 10800 },
      read: true,
    },
  ],
};

export function getEvents() {
  return [...store.events].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getEvent(id) {
  return store.events.find((e) => e.id === id) || null;
}

export function enterEvent(id) {
  const evt = store.events.find((e) => e.id === id);
  if (!evt) throw new Error('Event not found');
  if (evt.currentAttendees >= evt.maxCapacity) throw new Error('Event is at full capacity');

  evt.currentAttendees += 1;
  evt.updatedAt = new Date().toISOString();

  // Update zone
  const zone = store.zones.find((z) => z.id === evt.zoneId);
  if (zone) {
    zone.currentOccupancy += 1;
    zone.crowdLevel = getCrowdLevel(zone.currentOccupancy, zone.capacity);
    zone.updatedAt = new Date().toISOString();

    if (zone.crowdLevel === 'critical' || zone.crowdLevel === 'high') {
      store.alerts.unshift({
        id: `alert-${++alertIdCounter}`,
        type: zone.crowdLevel === 'critical' ? 'danger' : 'warning',
        title: `${zone.name} — ${zone.crowdLevel.toUpperCase()} crowd`,
        message: `Occupancy at ${Math.round((zone.currentOccupancy / zone.capacity) * 100)}% (${zone.currentOccupancy}/${zone.capacity}).`,
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
        read: false,
      });
    }
  }

  return { success: true, currentAttendees: evt.currentAttendees, message: `Entered ${evt.name}` };
}

export function leaveEvent(id) {
  const evt = store.events.find((e) => e.id === id);
  if (!evt) throw new Error('Event not found');
  if (evt.currentAttendees <= 0) throw new Error('No attendees to remove');

  evt.currentAttendees -= 1;
  evt.updatedAt = new Date().toISOString();

  const zone = store.zones.find((z) => z.id === evt.zoneId);
  if (zone) {
    zone.currentOccupancy = Math.max(0, zone.currentOccupancy - 1);
    zone.crowdLevel = getCrowdLevel(zone.currentOccupancy, zone.capacity);
    zone.updatedAt = new Date().toISOString();
  }

  return { success: true, currentAttendees: evt.currentAttendees, message: `Left ${evt.name}` };
}

export function getZones() {
  return store.zones;
}

export function getZone(id) {
  return store.zones.find((z) => z.id === id) || null;
}

export function getAlerts() {
  return store.alerts;
}

export function markAlertRead(id) {
  const alert = store.alerts.find((a) => a.id === id);
  if (alert) alert.read = true;
  return { success: true };
}

export function getAnalyticsSummary() {
  const events = store.events;
  const zones = store.zones;
  const totalAttendees = events.reduce((s, e) => s + (e.currentAttendees || 0), 0);
  const totalCapacity = events.reduce((s, e) => s + (e.maxCapacity || 0), 0);

  const zoneSummary = zones.map((z) => ({
    id: z.id,
    name: z.name,
    type: z.type,
    occupancy: z.currentOccupancy || 0,
    capacity: z.capacity,
    crowdLevel: z.crowdLevel || 'low',
    utilization: z.capacity > 0 ? Math.round(((z.currentOccupancy || 0) / z.capacity) * 100) : 0,
  }));

  return {
    totalAttendees,
    totalCapacity,
    overallUtilization: totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0,
    liveEvents: events.filter((e) => e.status === 'live').length,
    upcomingEvents: events.filter((e) => e.status === 'upcoming').length,
    totalEvents: events.length,
    criticalZones: zoneSummary.filter((z) => z.crowdLevel === 'critical' || z.crowdLevel === 'high'),
    zoneSummary,
  };
}

// ── Admin CRUD ──
let eventCounter = store.events.length;

export function createEvent(data) {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Event name is required');
  }
  const maxCapacity = Number(data.maxCapacity);
  if (isNaN(maxCapacity) || !Number.isInteger(maxCapacity) || maxCapacity <= 0) {
    throw new Error('Max capacity must be a positive integer');
  }
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end time');
  }
  if (end <= start) {
    throw new Error('End time must be after start time');
  }
  const zoneExists = store.zones.some((z) => z.id === data.zoneId);
  if (!zoneExists) {
    throw new Error(`Zone with ID ${data.zoneId} does not exist`);
  }

  const id = `evt-${++eventCounter}`;
  const evt = {
    id,
    name: data.name.trim(),
    sport: (data.sport || 'General').trim(),
    zoneId: data.zoneId,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status || 'upcoming',
    maxCapacity,
    currentAttendees: 0,
    description: (data.description || '').trim(),
    image: data.image || '🎫',
    updatedAt: new Date().toISOString(),
  };
  store.events.push(evt);
  return evt;
}

export function updateEvent(id, data) {
  const evt = store.events.find((e) => e.id === id);
  if (!evt) throw new Error('Event not found');

  const updateData = {};
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) throw new Error('Event name cannot be empty');
    updateData.name = data.name.trim();
  }
  if (data.sport !== undefined) updateData.sport = String(data.sport).trim();
  if (data.status !== undefined) updateData.status = data.status;
  if (data.description !== undefined) updateData.description = String(data.description).trim();
  if (data.image !== undefined) updateData.image = data.image;

  if (data.zoneId !== undefined) {
    const zoneExists = store.zones.some((z) => z.id === data.zoneId);
    if (!zoneExists) throw new Error(`Zone with ID ${data.zoneId} does not exist`);
    updateData.zoneId = data.zoneId;
  }

  let startTime = evt.startTime;
  let endTime = evt.endTime;
  if (data.startTime !== undefined) {
    const start = new Date(data.startTime);
    if (isNaN(start.getTime())) throw new Error('Invalid start time');
    startTime = data.startTime;
    updateData.startTime = startTime;
  }
  if (data.endTime !== undefined) {
    const end = new Date(data.endTime);
    if (isNaN(end.getTime())) throw new Error('Invalid end time');
    endTime = data.endTime;
    updateData.endTime = endTime;
  }
  if (new Date(endTime) <= new Date(startTime)) {
    throw new Error('End time must be after start time');
  }

  if (data.maxCapacity !== undefined) {
    const maxCapacity = Number(data.maxCapacity);
    if (isNaN(maxCapacity) || !Number.isInteger(maxCapacity) || maxCapacity <= 0) {
      throw new Error('Max capacity must be a positive integer');
    }
    if (maxCapacity < evt.currentAttendees) {
      throw new Error(`Max capacity cannot be lower than current attendees (${evt.currentAttendees})`);
    }
    updateData.maxCapacity = maxCapacity;
  }

  Object.assign(evt, {
    ...updateData,
    updatedAt: new Date().toISOString(),
  });
  return evt;
}

export function deleteEvent(id) {
  const idx = store.events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Event not found');
  store.events.splice(idx, 1);
  return { success: true };
}

export function updateZone(id, data) {
  const zone = store.zones.find((z) => z.id === id);
  if (!zone) throw new Error('Zone not found');

  const updateData = {};
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) throw new Error('Zone name cannot be empty');
    updateData.name = data.name.trim();
  }
  if (data.type !== undefined) updateData.type = data.type;

  if (data.capacity !== undefined) {
    const capacity = Number(data.capacity);
    if (isNaN(capacity) || !Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('Capacity must be a positive integer');
    }
    if (capacity < (zone.currentOccupancy || 0)) {
      throw new Error(`Capacity cannot be lower than current occupancy (${zone.currentOccupancy || 0})`);
    }
    updateData.capacity = capacity;
  }

  Object.assign(zone, {
    ...updateData,
    updatedAt: new Date().toISOString(),
  });
  zone.crowdLevel = getCrowdLevel(zone.currentOccupancy || 0, zone.capacity);
  return zone;
}

export function createZone(data) {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Zone name is required');
  }
  const capacity = Number(data.capacity);
  if (isNaN(capacity) || !Number.isInteger(capacity) || capacity <= 0) {
    throw new Error('Capacity must be a positive integer');
  }
  const id = data.id || `zone-${Date.now()}`;
  if (store.zones.some((z) => z.id === id)) {
    throw new Error(`Zone with ID ${id} already exists`);
  }
  const zone = {
    id,
    name: data.name.trim(),
    type: data.type || 'facility',
    capacity,
    currentOccupancy: 0,
    crowdLevel: 'low',
    points: data.points || '0,0 50,0 50,50 0,50',
    center: data.center || { x: 25, y: 25 },
    color: data.color || '#9aa0a6',
    updatedAt: new Date().toISOString(),
  };
  store.zones.push(zone);
  return zone;
}

export function deleteZone(id) {
  const idx = store.zones.findIndex((z) => z.id === id);
  if (idx === -1) throw new Error('Zone not found');
  store.zones.splice(idx, 1);
  return { success: true };
}

export default store;
