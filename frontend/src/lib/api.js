// Backend API client — all mutations go through Node.js server

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const stored = localStorage.getItem('vf_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.accessId) {
        headers['Authorization'] = `Bearer ${parsed.accessId}`;
      }
    }
  } catch (e) {
    // ignore
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Events
export const getEvents = () => request('/events');
export const enterEvent = (id) => request(`/events/${id}/enter`, { method: 'POST' });
export const leaveEvent = (id) => request(`/events/${id}/leave`, { method: 'POST' });

// Zones
export const getZones = () => request('/zones');

// Navigation
export const getRoute = (from, to) =>
  request('/navigation/route', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });

// Analytics
export const getAnalyticsSummary = () => request('/analytics/summary');

// Alerts
export const markAlertRead = (id) => request(`/alerts/${id}/read`, { method: 'PATCH' });

// Intelligence
export const getIntelligence = () => request('/intelligence');

// Admin
export const adminCreateEvent = (data) => request('/admin/events', { method: 'POST', body: JSON.stringify(data) });
export const adminUpdateEvent = (id, data) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminDeleteEvent = (id) => request(`/admin/events/${id}`, { method: 'DELETE' });
export const adminCreateZone = (data) => request('/admin/zones', { method: 'POST', body: JSON.stringify(data) });
export const adminUpdateZone = (id, data) => request(`/admin/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminDeleteZone = (id) => request(`/admin/zones/${id}`, { method: 'DELETE' });
