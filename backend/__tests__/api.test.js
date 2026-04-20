import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';

/**
 * Integration tests for VenueFlow API endpoints.
 * Requires the server to be running on port 4000 (demo mode).
 */

describe('API Health', () => {
  it('GET /api/health returns status ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.mode);
    assert.ok(typeof data.uptime === 'number');
  });
});

describe('Events API', () => {
  it('GET /api/events returns an array of events', async () => {
    const res = await fetch(`${BASE_URL}/api/events`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].id);
    assert.ok(data[0].name);
  });

  it('POST /api/events/:id/enter increments attendees', async () => {
    const events = await (await fetch(`${BASE_URL}/api/events`)).json();
    const evt = events.find((e) => e.currentAttendees < e.maxCapacity);
    assert.ok(evt, 'Should have an event with available capacity');

    const res = await fetch(`${BASE_URL}/api/events/${evt.id}/enter`, { method: 'POST' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.currentAttendees, evt.currentAttendees + 1);
  });

  it('POST /api/events/:id/enter returns 409 when event is full', async () => {
    const events = await (await fetch(`${BASE_URL}/api/events`)).json();
    const fullEvt = events.find((e) => e.currentAttendees >= e.maxCapacity);
    if (!fullEvt) {
      // Force an event to full by entering repeatedly
      const small = events.reduce((a, b) => (a.maxCapacity - a.currentAttendees) < (b.maxCapacity - b.currentAttendees) ? a : b);
      // Fill it up
      const remaining = small.maxCapacity - small.currentAttendees;
      for (let i = 0; i < remaining; i++) {
        await fetch(`${BASE_URL}/api/events/${small.id}/enter`, { method: 'POST' });
      }
      const res = await fetch(`${BASE_URL}/api/events/${small.id}/enter`, { method: 'POST' });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.ok(data.error);
    } else {
      const res = await fetch(`${BASE_URL}/api/events/${fullEvt.id}/enter`, { method: 'POST' });
      assert.equal(res.status, 409);
    }
  });

  it('POST /api/events/:id/leave returns 400 when no attendees', async () => {
    const events = await (await fetch(`${BASE_URL}/api/events`)).json();
    const emptyEvt = events.find((e) => e.currentAttendees <= 0);
    if (emptyEvt) {
      const res = await fetch(`${BASE_URL}/api/events/${emptyEvt.id}/leave`, { method: 'POST' });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    }
  });
});

describe('Zones API', () => {
  it('GET /api/zones returns an array of zones', async () => {
    const res = await fetch(`${BASE_URL}/api/zones`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].id);
    assert.ok(data[0].name);
    assert.ok(data[0].capacity > 0);
  });
});

describe('Navigation API', () => {
  it('POST /api/navigation/route returns a valid route', async () => {
    const res = await fetch(`${BASE_URL}/api/navigation/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'gate-1', to: 'food-court-a' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.path));
    assert.ok(data.path.length >= 2);
    assert.equal(data.path[0], 'gate-1');
    assert.equal(data.path[data.path.length - 1], 'food-court-a');
    assert.ok(data.estimatedTime > 0);
  });

  it('POST /api/navigation/route returns 400 for missing params', async () => {
    const res = await fetch(`${BASE_URL}/api/navigation/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});

describe('Analytics API', () => {
  it('GET /api/analytics/summary returns analytics data', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/summary`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data);
    assert.ok(typeof data === 'object');
  });
});

describe('Intelligence API', () => {
  it('GET /api/intelligence returns intelligence payload', async () => {
    const res = await fetch(`${BASE_URL}/api/intelligence`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.insights, 'Should have insights array');
    assert.ok(data.bottlenecks, 'Should have bottlenecks array');
    assert.ok(data.suggestions, 'Should have suggestions array');
    assert.ok(data.flowData, 'Should have flowData array');
    assert.ok(data.summary, 'Should have summary object');
    assert.ok(typeof data.summary.totalAttendees === 'number');
    assert.ok(typeof data.summary.overallPct === 'number');
  });

  it('GET /api/intelligence returns trend data for sparklines', async () => {
    const res = await fetch(`${BASE_URL}/api/intelligence`);
    const data = await res.json();
    assert.ok(data.trends, 'Should have trends');
    assert.ok(Array.isArray(data.trends.attendees));
    assert.ok(Array.isArray(data.trends.utilization));
    assert.ok(data.trends.attendees.length > 0);
  });
});

describe('Admin CRUD API', () => {
  let createdEventId;

  it('POST /api/admin/events creates a new event', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Event',
        sport: 'Testing',
        zoneId: 'main-stadium',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        status: 'upcoming',
        maxCapacity: 100,
        description: 'A test event',
        image: '🧪',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.name, 'Test Event');
    createdEventId = data.id;
  });

  it('PUT /api/admin/events/:id updates an event', async () => {
    assert.ok(createdEventId, 'Need created event ID');
    const res = await fetch(`${BASE_URL}/api/admin/events/${createdEventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Test Event', maxCapacity: 200 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.name, 'Updated Test Event');
    assert.equal(data.maxCapacity, 200);
  });

  it('DELETE /api/admin/events/:id deletes an event', async () => {
    assert.ok(createdEventId, 'Need created event ID');
    const res = await fetch(`${BASE_URL}/api/admin/events/${createdEventId}`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  it('PUT /api/admin/zones/:id updates a zone', async () => {
    const zones = await (await fetch(`${BASE_URL}/api/zones`)).json();
    const zone = zones[0];
    const res = await fetch(`${BASE_URL}/api/admin/zones/${zone.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: zone.name, capacity: zone.capacity + 100 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.capacity, zone.capacity + 100);
  });
});

describe('Error Handling', () => {
  it('returns 404 for invalid API route', async () => {
    const res = await fetch(`${BASE_URL}/api/nonexistent-route`);
    assert.equal(res.status, 404);
  });
});

describe('Rate Limiting', () => {
  it('includes rate limit headers in response', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    // standardHeaders: true means RateLimit-* headers
    const hasRateLimit = res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit') || res.headers.get('ratelimit-policy');
    assert.ok(hasRateLimit, 'Should include rate limit headers');
  });
});

describe('Metrics API', () => {
  it('GET /api/metrics returns performance metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/metrics`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.uptime === 'number');
    assert.ok(typeof data.memoryUsage === 'object');
    assert.ok(typeof data.requestCount === 'number');
  });
});
