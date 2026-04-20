import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, LogOut, MapPin, Clock, Users, Search, Ticket, ChevronDown,
  Navigation2, Activity, Utensils, ShoppingBag, Cross, Car, DoorOpen,
  TrendingUp, AlertTriangle, CheckCircle2, Wifi,
} from 'lucide-react';
import { enterEvent, leaveEvent } from '../lib/api';
import { VENUE_ZONES, ZONE_MAP } from '../lib/venueData';
import VenueMap from '../components/VenueMap';

/* ── Nearby facilities lookup ── */
const ADJACENCY = {
  'main-stadium': ['north-concourse', 'south-concourse', 'east-gate', 'west-gate'],
  'north-concourse': ['gate-1', 'gate-2', 'main-stadium', 'food-court-a'],
  'south-concourse': ['gate-3', 'gate-4', 'main-stadium', 'food-court-b'],
  'east-gate': ['main-stadium', 'parking-east', 'merch-store', 'food-court-a', 'food-court-b'],
  'west-gate': ['main-stadium', 'parking-west', 'first-aid'],
  'food-court-a': ['north-concourse', 'east-gate'],
  'food-court-b': ['south-concourse', 'east-gate'],
  'merch-store': ['east-gate'],
  'first-aid': ['west-gate'],
  'parking-east': ['east-gate'],
  'parking-west': ['west-gate'],
  'gate-1': ['north-concourse'],
  'gate-2': ['north-concourse'],
  'gate-3': ['south-concourse'],
  'gate-4': ['south-concourse'],
};

const FACILITY_ICON = {
  amenity: Utensils, facility: Cross, parking: Car, entrance: DoorOpen, gate: DoorOpen,
};

function getCrowdStatus(pct) {
  if (pct >= 85) return { label: 'Congested', color: 'text-google-red', bg: 'bg-red-50', icon: '🔴' };
  if (pct >= 65) return { label: 'Busy', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '🟡' };
  if (pct >= 35) return { label: 'Moderate', color: 'text-google-blue', bg: 'bg-blue-50', icon: '🔵' };
  return { label: 'Smooth', color: 'text-google-green', bg: 'bg-green-50', icon: '🟢' };
}

function getInsight(evt, pct, zone) {
  if (pct >= 85) return `${zone?.name || 'Zone'} is near capacity. Expect queues at entry points.`;
  if (pct >= 65) return `Filling up — consider arriving soon to avoid longer wait times.`;
  if (pct >= 35) return `Good crowd energy. Comfortable space with steady flow.`;
  return `Plenty of room. Great time to join with minimal wait.`;
}

function getNearbyFacilities(zoneId) {
  const neighbors = ADJACENCY[zoneId] || [];
  return neighbors
    .map((id) => ZONE_MAP[id])
    .filter((z) => z && (z.type === 'amenity' || z.type === 'facility' || z.type === 'parking' || z.type === 'entrance'))
    .slice(0, 4);
}

const STATUS_CONFIG = {
  live: { badge: 'badge-green', dot: 'bg-google-green' },
  upcoming: { badge: 'badge-blue', dot: 'bg-google-blue' },
  ended: { badge: 'badge-red', dot: 'bg-google-red' },
};

export default function Events({ events, zones }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [userZone, setUserZone] = useState(null); // tracks which zone user "entered"

  const filtered = events.filter((e) => {
    const ms = e.name.toLowerCase().includes(search.toLowerCase()) || e.sport.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'all' || e.status === statusFilter;
    return ms && mf;
  });

  const liveCount = events.filter((e) => e.status === 'live').length;
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length;

  // Determine which zone to highlight on map
  const activeZoneId = useMemo(() => {
    if (hoveredEvent) {
      const evt = events.find((e) => e.id === hoveredEvent);
      return evt?.zoneId || null;
    }
    if (expandedEvent) {
      const evt = events.find((e) => e.id === expandedEvent);
      return evt?.zoneId || null;
    }
    return userZone;
  }, [hoveredEvent, expandedEvent, userZone, events]);

  // Affected zones for expanded event (zone + neighbors)
  const affectedZones = useMemo(() => {
    if (!expandedEvent) return [];
    const evt = events.find((e) => e.id === expandedEvent);
    if (!evt) return [];
    return [evt.zoneId, ...(ADJACENCY[evt.zoneId] || []).slice(0, 3)];
  }, [expandedEvent, events]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEnter = async (evt) => {
    setLoading((p) => ({ ...p, [evt.id]: 'enter' }));
    try {
      const res = await enterEvent(evt.id);
      setUserZone(evt.zoneId);
      showToast('success', `✓ Joined ${evt.name} — you're now in ${ZONE_MAP[evt.zoneId]?.name || evt.zoneId}`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading((p) => ({ ...p, [evt.id]: null }));
    }
  };

  const handleLeave = async (evt) => {
    setLoading((p) => ({ ...p, [evt.id]: 'leave' }));
    try {
      const res = await leaveEvent(evt.id);
      if (userZone === evt.zoneId) setUserZone(null);
      showToast('success', `✓ Left ${evt.name}`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading((p) => ({ ...p, [evt.id]: null }));
    }
  };

  const handleJoinAndNavigate = async (evt) => {
    await handleEnter(evt);
    navigate(`/navigation?to=${evt.zoneId}`);
  };

  const handleExitAndRoute = async (evt) => {
    await handleLeave(evt);
    navigate(`/navigation?from=${evt.zoneId}`);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Live zone data lookup
  const liveZoneMap = Object.fromEntries(zones.map((z) => [z.id, z]));

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-slide-in max-w-sm ${toast.type === 'success' ? 'gradient-green text-white' : 'gradient-red text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-google-gray-900">Events</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-google-gray-500 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-google-green" /> {liveCount} live</span>
            <span className="text-sm text-google-gray-500 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-google-blue" /> {upcomingCount} upcoming</span>
            {userZone && (
              <span className="text-sm text-google-blue inline-flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5" /> You're in {ZONE_MAP[userZone]?.name || userZone}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-google-gray-400" />
            <input type="text" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 pr-4 w-full sm:w-56" aria-label="Search events" />
          </div>
          <div className="flex items-center bg-white rounded-xl border border-google-gray-200 p-1 shadow-sm">
            {['all', 'live', 'upcoming'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize ${statusFilter === s ? 'bg-google-blue text-white shadow-sm' : 'text-google-gray-600 hover:bg-google-gray-50'}`}>
                {s === 'all' ? `All (${events.length})` : s === 'live' ? `Live (${liveCount})` : `Upcoming (${upcomingCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Events list */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <div className="card-elevated p-16 text-center">
              <Ticket className="w-12 h-12 text-google-gray-200 mx-auto mb-4" />
              <p className="text-google-gray-500 font-medium">No events match your filters</p>
            </div>
          )}
          {filtered.map((evt) => {
            const pct = evt.maxCapacity > 0 ? Math.round((evt.currentAttendees / evt.maxCapacity) * 100) : 0;
            const isFull = pct >= 100;
            const barColor = pct >= 85 ? 'bg-google-red' : pct >= 65 ? 'bg-google-yellow' : pct >= 35 ? 'bg-google-blue' : 'bg-google-green';
            const zone = ZONE_MAP[evt.zoneId];
            const liveZone = liveZoneMap[evt.zoneId];
            const isLoading = loading[evt.id];
            const isExpanded = expandedEvent === evt.id;
            const isHovered = hoveredEvent === evt.id;
            const config = STATUS_CONFIG[evt.status] || STATUS_CONFIG.upcoming;
            const crowd = getCrowdStatus(pct);
            const nearby = getNearbyFacilities(evt.zoneId);
            const isUserHere = userZone === evt.zoneId;

            return (
              <div
                key={evt.id}
                id={`event-${evt.id}`}
                className={`card-elevated overflow-hidden transition-all duration-200 ${isHovered ? 'ring-1 ring-google-blue/30' : ''} ${isUserHere ? 'border-l-4 border-l-google-blue' : ''}`}
                onMouseEnter={() => setHoveredEvent(evt.id)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                {/* Card header */}
                <div className="p-4 sm:p-5 pb-3">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-google-gray-50 to-google-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
                      {evt.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-google-gray-900 truncate">{evt.name}</h3>
                        <span className={config.badge}><span className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1`} />{evt.status}</span>
                        {/* Crowd status badge */}
                        <span className={`badge text-[10px] ${crowd.bg} ${crowd.color}`}>{crowd.icon} {crowd.label}</span>
                        {isUserHere && <span className="badge text-[10px] bg-google-lightBlue text-google-blue">📍 You're here</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-google-gray-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {zone?.name || evt.zoneId}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatTime(evt.startTime)} – {formatTime(evt.endTime)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {(evt.currentAttendees || 0).toLocaleString()} / {evt.maxCapacity.toLocaleString()}</span>
                      </div>
                      {/* Mini insight */}
                      <p className="text-[11px] text-google-gray-400 mt-1.5 flex items-center gap-1">
                        <Activity className="w-3 h-3 flex-shrink-0" /> {getInsight(evt, pct, zone)}
                      </p>
                      {/* Capacity bar */}
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-google-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold min-w-[36px] text-right ${pct >= 85 ? 'text-google-red' : pct >= 65 ? 'text-yellow-600' : 'text-google-gray-600'}`}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action bar — always visible */}
                <div className="px-4 sm:px-5 pb-3">
                  {evt.status === 'live' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-google-gray-50 border border-google-gray-100 flex-wrap">
                      <button onClick={() => handleEnter(evt)} disabled={isFull || isLoading === 'enter'} className="btn-primary flex items-center gap-1.5 text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <LogIn className="w-3.5 h-3.5" />
                        {isLoading === 'enter' ? 'Joining...' : isFull ? 'Full' : 'Join Event'}
                      </button>
                      <button onClick={() => handleJoinAndNavigate(evt)} disabled={isFull || isLoading === 'enter'} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Navigation2 className="w-3.5 h-3.5" /> Join & Navigate
                      </button>
                      <div className="w-px h-6 bg-google-gray-200 mx-1 hidden sm:block" />
                      <button onClick={() => handleLeave(evt)} disabled={evt.currentAttendees <= 0 || isLoading === 'leave'} className="btn-danger flex items-center gap-1.5 text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <LogOut className="w-3.5 h-3.5" />
                        {isLoading === 'leave' ? 'Leaving...' : 'Exit Event'}
                      </button>
                      {isUserHere && (
                        <button onClick={() => handleExitAndRoute(evt)} className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2">
                          <Navigation2 className="w-3.5 h-3.5" /> Exit & Find Route
                        </button>
                      )}
                      <span className="ml-auto text-[11px] text-google-gray-400 hidden sm:flex items-center gap-1">
                        {isFull ? <AlertTriangle className="w-3 h-3 text-google-red" /> : <CheckCircle2 className="w-3 h-3 text-google-green" />}
                        {isFull ? 'No spots left' : `${(evt.maxCapacity - evt.currentAttendees).toLocaleString()} spots`}
                      </span>
                    </div>
                  )}
                  {evt.status === 'upcoming' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <Clock className="w-4 h-4 text-google-blue flex-shrink-0" />
                      <span className="text-xs text-google-blue">Starts at {formatTime(evt.startTime)} — entry opens when live</span>
                    </div>
                  )}
                </div>

                {/* Expand toggle */}
                <div className="px-4 sm:px-5">
                  <button onClick={() => setExpandedEvent(isExpanded ? null : evt.id)} className="flex items-center gap-1.5 text-xs text-google-gray-400 hover:text-google-gray-600 transition-colors pb-3 w-full">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded ? 'Hide details' : 'Event details & nearby'}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 border-t border-google-gray-100 space-y-4 pt-4">
                    <p className="text-sm text-google-gray-500">{evt.description}</p>

                    {/* Crowd trend prediction */}
                    <div className="p-3 rounded-xl bg-google-gray-50 border border-google-gray-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <TrendingUp className="w-4 h-4 text-google-blue" />
                        <span className="text-xs font-semibold text-google-gray-700">Crowd Trend</span>
                      </div>
                      <p className="text-[11px] text-google-gray-500">
                        {pct >= 65
                          ? `Crowd density is high and trending upward. Peak expected in ~15 min. Consider alternate entry via ${ADJACENCY[evt.zoneId]?.find((id) => ZONE_MAP[id]?.type === 'gate' || ZONE_MAP[id]?.type === 'entrance') ? ZONE_MAP[ADJACENCY[evt.zoneId].find((id) => ZONE_MAP[id]?.type === 'gate' || ZONE_MAP[id]?.type === 'entrance')]?.name : 'nearby gate'}.`
                          : pct >= 35
                          ? 'Steady crowd flow. Density is moderate and stable. Good time to enter.'
                          : 'Low crowd density. Expect smooth entry with no wait times.'}
                      </p>
                    </div>

                    {/* Nearby facilities */}
                    {nearby.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-google-gray-700 mb-2">Nearby Facilities</p>
                        <div className="grid grid-cols-2 gap-2">
                          {nearby.map((fac) => {
                            const FIcon = FACILITY_ICON[fac.type] || MapPin;
                            const facLive = liveZoneMap[fac.id];
                            const facPct = fac.capacity > 0 ? Math.round(((facLive?.currentOccupancy || 0) / fac.capacity) * 100) : 0;
                            const facCrowd = getCrowdStatus(facPct);
                            return (
                              <div key={fac.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-google-gray-100">
                                <FIcon className="w-3.5 h-3.5 text-google-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-medium text-google-gray-700 truncate">{fac.name}</p>
                                  <p className={`text-[10px] ${facCrowd.color}`}>{facCrowd.icon} {facCrowd.label}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Entry/exit suggestion */}
                    {evt.status === 'live' && (
                      <div className={`p-3 rounded-xl text-xs ${pct >= 65 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-google-green'}`}>
                        <p className="font-semibold mb-0.5">{pct >= 65 ? '⚡ Entry Suggestion' : '✓ Entry Clear'}</p>
                        <p className="opacity-80">
                          {pct >= 65
                            ? `Use ${ADJACENCY[evt.zoneId]?.find((id) => ZONE_MAP[id]?.type === 'concourse') ? ZONE_MAP[ADJACENCY[evt.zoneId].find((id) => ZONE_MAP[id]?.type === 'concourse')]?.name : 'alternate concourse'} for faster entry. Main paths are congested.`
                            : 'All entry points are flowing smoothly. No detour needed.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar: Map + Zone info */}
        <div className="space-y-5">
          <div className="card-elevated p-5 sticky top-24">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-google-gray-900">Venue Map</h2>
              <span className="text-[10px] text-google-gray-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> Live</span>
            </div>
            <VenueMap
              zones={zones}
              compact
              selectedZone={activeZoneId}
              highlightPath={affectedZones}
              onZoneClick={(zId) => {
                // Find event in this zone and expand it
                const evt = filtered.find((e) => e.zoneId === zId);
                if (evt) {
                  setExpandedEvent(evt.id);
                  setHoveredEvent(evt.id);
                  document.getElementById(`event-${evt.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />
            <div className="flex items-center gap-3 mt-3 text-[10px] text-google-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-green" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-blue" /> Med</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-yellow" /> High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-red" /> Full</span>
            </div>

            {/* User location indicator */}
            {userZone && (
              <div className="mt-3 pt-3 border-t border-google-gray-100">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-google-lightBlue">
                  <MapPin className="w-4 h-4 text-google-blue" />
                  <div>
                    <p className="text-xs font-medium text-google-blue">Your Location</p>
                    <p className="text-[10px] text-google-blue/70">{ZONE_MAP[userZone]?.name || userZone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone occupancy summary */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-semibold text-google-gray-900 mb-3">Zone Occupancy</h2>
            <div className="space-y-2.5">
              {zones.filter((z) => (z.currentOccupancy || 0) > 0).sort((a, b) => (b.currentOccupancy || 0) - (a.currentOccupancy || 0)).slice(0, 6).map((z) => {
                const zPct = z.capacity > 0 ? Math.round(((z.currentOccupancy || 0) / z.capacity) * 100) : 0;
                const isUser = userZone === z.id;
                return (
                  <div key={z.id} className={`${isUser ? 'bg-google-lightBlue/30 rounded-lg p-1.5 -mx-1.5' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-google-gray-600 flex items-center gap-1">
                        {isUser && <MapPin className="w-3 h-3 text-google-blue" />}
                        {z.name}
                      </span>
                      <span className="text-xs font-semibold text-google-gray-900">{zPct}%</span>
                    </div>
                    <div className="h-1.5 bg-google-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${zPct >= 85 ? 'bg-google-red' : zPct >= 65 ? 'bg-google-yellow' : zPct >= 35 ? 'bg-google-blue' : 'bg-google-green'}`} style={{ width: `${zPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
