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
