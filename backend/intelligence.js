/**
 * @fileoverview Predictive intelligence engine for VenueFlow.
 * Computes real-time smart insights, bottleneck detection, suggested operational
 * actions, movement flow indicators, and event phase tracking. Auto-refreshes
 * every 5 seconds on the frontend to provide live decision support.
 * @module intelligence
 */
import store from './demoStore.js';

// ── Memoization cache for intelligence results ──
// Caches results for 2 seconds to avoid recomputation on rapid polling
let _intelligenceCache = null;
let _intelligenceCacheTime = 0;
const CACHE_TTL_MS = 2000;

// ── Zone lookup Map for O(1) access in hot paths ──
function buildZoneMap(zones) {
  const map = new Map();
  for (const z of zones) map.set(z.id, z);
  return map;
}

// Simulated historical trend data (sparkline points, last 8 intervals)
function generateTrend(current, capacity, volatility = 0.15) {
  const points = [];
  const base = current / capacity;
  for (let i = 7; i >= 0; i--) {
    const noise = (Math.random() - 0.5) * volatility;
    const val = Math.max(0, Math.min(1, base - i * 0.03 + noise));
    points.push(Math.round(val * 100));
  }
  points.push(Math.round(base * 100)); // current as last point
  return points;
}

function getFlowDirection(zone) {
  const ratio = (zone.currentOccupancy || 0) / zone.capacity;
  // Simulate: high-occupancy zones are filling, low are draining
  if (ratio > 0.6) return 'filling';
  if (ratio > 0.3) return 'stable';
  return 'draining';
}

function getEntryExitRate(zone) {
  const occ = zone.currentOccupancy || 0;
  const cap = zone.capacity;
  const ratio = occ / cap;
  // Simulated rates per minute
  const entryRate = Math.round(ratio > 0.5 ? 8 + Math.random() * 12 : 2 + Math.random() * 6);
  const exitRate = Math.round(ratio > 0.7 ? 3 + Math.random() * 5 : 1 + Math.random() * 4);
  return { entryRate, exitRate, netFlow: entryRate - exitRate };
}

function getEventPhase(event) {
  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const totalDuration = end - start;
  const elapsed = now - start;

  if (now < start) return { phase: 'pre-event', label: 'Pre-Event', progress: 0, icon: '🔜' };
  if (now > end) return { phase: 'post-event', label: 'Ended', progress: 100, icon: '✅' };

  const pct = Math.round((elapsed / totalDuration) * 100);
  if (pct < 20) return { phase: 'entry', label: 'Entry Phase', progress: pct, icon: '🚪', desc: 'Attendees are arriving' };
  if (pct < 75) return { phase: 'peak', label: 'Peak Phase', progress: pct, icon: '🔥', desc: 'Event at full swing' };
  return { phase: 'exit', label: 'Exit Phase', progress: pct, icon: '🚶', desc: 'Attendees beginning to leave' };
}

export function getIntelligence() {
  // Return cached result if within TTL
  const now = Date.now();
  if (_intelligenceCache && (now - _intelligenceCacheTime) < CACHE_TTL_MS) {
    return _intelligenceCache;
  }

  const events = store.events;
  const zones = store.zones;
  const zoneMap = buildZoneMap(zones);

  const totalAttendees = events.reduce((s, e) => s + (e.currentAttendees || 0), 0);
  const totalCapacity = events.reduce((s, e) => s + (e.maxCapacity || 0), 0);
  const overallPct = totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0;
  const liveEvents = events.filter((e) => e.status === 'live');
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');

  // ── Smart Insights ──
  const insights = [];

  // Specific zone capacity prediction with ETA
  const amenityZones = zones.filter((z) => z.type === 'amenity');
  for (const z of amenityZones) {
    const ratio = (z.currentOccupancy || 0) / z.capacity;
    const flow = getFlowDirection(z);
    const rates = getEntryExitRate(z);
    if (flow === 'filling' && ratio > 0.3) {
      const spotsLeft = z.capacity - (z.currentOccupancy || 0);
      const netInflow = Math.max(rates.netFlow, 1);
      const etaMinutes = Math.round(spotsLeft / netInflow);
      if (etaMinutes < 30) {
        // Find a less crowded alternative
        const alternatives = amenityZones.filter((a) => a.id !== z.id && ((a.currentOccupancy || 0) / a.capacity) < ratio);
        const altName = alternatives.length > 0 ? alternatives[0].name : 'nearby zones';
        insights.push({
          type: 'prediction',
          severity: 'warning',
          title: `${z.name} approaching critical`,
          message: `At current flow (+${rates.netFlow}/min), ${z.name} will hit capacity in ~${etaMinutes} min. Recommend rerouting foot traffic to ${altName}.`,
          icon: '⏱️',
          eta: etaMinutes,
          zoneId: z.id,
          alternativeZone: alternatives[0]?.id || null,
        });
      }
    }
  }

  // General congestion prediction for non-amenity zones
  const fillingZones = zones.filter((z) => {
    const flow = getFlowDirection(z);
    return flow === 'filling' && (z.currentOccupancy || 0) / z.capacity > 0.5 && z.type !== 'amenity';
  });
  if (fillingZones.length > 0) {
    const names = fillingZones.slice(0, 2).map((z) => z.name).join(', ');
    const eta = Math.round(10 + Math.random() * 15);
    insights.push({
      type: 'prediction',
      severity: 'warning',
      title: 'Congestion predicted',
      message: `${names} ${fillingZones.length > 1 ? 'are' : 'is'} filling rapidly. Expected to reach critical in ~${eta} min.`,
      icon: '📈',
    });
  }

  // Upcoming event surge
  if (upcomingEvents.length > 0) {
    const next = upcomingEvents[0];
    const minsUntil = Math.max(0, Math.round((new Date(next.startTime) - new Date()) / 60000));
    if (minsUntil < 60) {
      insights.push({
        type: 'prediction',
        severity: 'info',
        title: 'Incoming surge expected',
        message: `"${next.name}" starts in ${minsUntil} min. Expect ${Math.round(next.maxCapacity * 0.4).toLocaleString()} arrivals at nearby gates.`,
        icon: '🌊',
      });
    }
  }

  // Dynamic observation
  if (overallPct > 50) {
    insights.push({
      type: 'observation',
      severity: 'neutral',
      title: 'Venue above half capacity',
      message: `Overall utilization at ${overallPct}%. Peak crowd density in Main Stadium area.`,
      icon: '👁️',
    });
  }

  // Food court insight
  const foodZones = zones.filter((z) => z.type === 'amenity');
  const avgFoodUtil = foodZones.length > 0
    ? Math.round(foodZones.reduce((s, z) => s + ((z.currentOccupancy || 0) / z.capacity), 0) / foodZones.length * 100)
    : 0;
  if (avgFoodUtil > 30) {
    insights.push({
      type: 'observation',
      severity: 'neutral',
      title: 'Food areas busy',
      message: `Average food zone utilization at ${avgFoodUtil}%. Consider directing overflow to Food Court B.`,
      icon: '🍔',
    });
  }

  // ── Trend data for KPI sparklines ──
  const trends = {
    attendees: generateTrend(totalAttendees, totalCapacity, 0.08),
    utilization: generateTrend(overallPct, 100, 0.1),
    activeZones: [5, 6, 5, 7, 6, 8, 7, zones.filter((z) => (z.currentOccupancy || 0) > 0).length],
    alerts: [1, 0, 2, 1, 3, 2, 4, store.alerts.filter((a) => !a.read).length],
  };

  // ── Bottleneck Detection ──
  const bottlenecks = zones
    .filter((z) => {
      const ratio = (z.currentOccupancy || 0) / z.capacity;
      return ratio > 0.5 || z.crowdLevel === 'critical' || z.crowdLevel === 'high';
    })
    .map((z) => {
      const ratio = (z.currentOccupancy || 0) / z.capacity;
      const flow = getFlowDirection(z);
      const rates = getEntryExitRate(z);
      let issue = 'High occupancy';
      if (flow === 'filling' && ratio > 0.6) issue = 'Rapidly filling — bottleneck forming';
      else if (ratio > 0.85) issue = 'Near capacity — severe bottleneck';
      else if (z.type === 'entrance' || z.type === 'gate') issue = 'Gate congestion — slow throughput';

      return {
        zoneId: z.id,
        zoneName: z.name,
        zoneType: z.type,
        occupancy: z.currentOccupancy || 0,
        capacity: z.capacity,
        utilization: Math.round(ratio * 100),
        crowdLevel: z.crowdLevel,
        issue,
        flow,
        ...rates,
        severity: ratio > 0.85 ? 'critical' : ratio > 0.65 ? 'high' : 'moderate',
      };
    })
    .sort((a, b) => b.utilization - a.utilization);

  // ── Suggested Actions ──
  const suggestions = [];

  if (bottlenecks.some((b) => b.severity === 'critical')) {
    const critical = bottlenecks.find((b) => b.severity === 'critical');
    suggestions.push({
      priority: 'high',
      action: `Open additional exits at ${critical.zoneName}`,
      reason: `${critical.zoneName} at ${critical.utilization}% — risk of overcrowding`,
      impact: 'Could reduce wait times by ~40%',
      type: 'staffing',
    });
  }

  // Specific food court rerouting based on capacity predictions
  const foodCourtA = zoneMap.get('food-court-a');
  const foodCourtB = zoneMap.get('food-court-b');
  if (foodCourtA && foodCourtB) {
    const ratioA = (foodCourtA.currentOccupancy || 0) / foodCourtA.capacity;
    const ratioB = (foodCourtB.currentOccupancy || 0) / foodCourtB.capacity;
    if (ratioA > 0.3 && ratioA > ratioB + 0.1) {
      suggestions.push({
        priority: 'high',
        action: `Reroute foot traffic from Food Court A to Food Court B`,
        reason: `Food Court A at ${Math.round(ratioA * 100)}% vs Food Court B at ${Math.round(ratioB * 100)}% — imbalanced load`,
        impact: `Reduces Food Court A queue by ~35% and balances crowd distribution`,
        type: 'routing',
      });
    }
  }

  // Mobile cart deployment suggestion
  const southConcourse = zoneMap.get('south-concourse');
  if (avgFoodUtil > 25 && southConcourse) {
    const scRatio = (southConcourse.currentOccupancy || 0) / southConcourse.capacity;
    suggestions.push({
      priority: scRatio < 0.3 ? 'high' : 'medium',
      action: 'Deploy mobile food carts to South Concourse',
      reason: `Food zones at ${avgFoodUtil}% avg. South Concourse at ${Math.round(scRatio * 100)}% has capacity for overflow service`,
      impact: 'Reduces food court pressure by ~20% and serves underserved areas',
      type: 'operations',
    });
  }

  if (bottlenecks.length > 1) {
    suggestions.push({
      priority: 'medium',
      action: 'Activate overflow routing to West Wing',
      reason: `${bottlenecks.length} zones experiencing congestion simultaneously`,
      impact: 'Distributes crowd across underutilized areas',
      type: 'routing',
    });
  }

  suggestions.push({
    priority: 'low',
    action: 'Send push notification: "Skip the line — Food Court B has shorter wait"',
    reason: 'Attendee redistribution opportunity',
    impact: 'Balances load across amenity zones',
    type: 'communication',
  });

  // ── Movement / Flow indicators per zone ──
  const flowData = zones
    .filter((z) => (z.currentOccupancy || 0) > 0)
    .map((z) => ({
      zoneId: z.id,
      zoneName: z.name,
      direction: getFlowDirection(z),
      ...getEntryExitRate(z),
      occupancy: z.currentOccupancy || 0,
      capacity: z.capacity,
    }))
    .sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));

  // ── Event Context ──
  const eventContext = events.map((e) => ({
    id: e.id,
    name: e.name,
    image: e.image,
    sport: e.sport,
    status: e.status,
    currentAttendees: e.currentAttendees,
    maxCapacity: e.maxCapacity,
    ...getEventPhase(e),
  }));

  const result = {
    insights,
    trends,
    bottlenecks,
    suggestions,
    flowData,
    eventContext,
    summary: {
      totalAttendees,
      totalCapacity,
      overallPct,
      liveCount: liveEvents.length,
      upcomingCount: upcomingEvents.length,
      criticalZoneCount: zones.filter((z) => z.crowdLevel === 'critical').length,
      highZoneCount: zones.filter((z) => z.crowdLevel === 'high').length,
      unreadAlerts: store.alerts.filter((a) => !a.read).length,
    },
  };

  // Store in cache
  _intelligenceCache = result;
  _intelligenceCacheTime = now;

  return result;
}
