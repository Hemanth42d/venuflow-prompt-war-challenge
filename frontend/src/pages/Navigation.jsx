import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navigation2, Clock, AlertTriangle, ChevronRight, RotateCcw, ArrowDownUp, Footprints, MapPin } from 'lucide-react';
import VenueMap from '../components/VenueMap';
import { VENUE_ZONES } from '../lib/venueData';
import { getRoute } from '../lib/api';

const CROWD_BADGE = { critical: 'badge-red', high: 'badge-yellow', moderate: 'badge-blue', low: 'badge-green' };

export default function Navigation({ zones }) {
  const [searchParams] = useSearchParams();
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-find route if both params provided via URL
  useEffect(() => {
    const qFrom = searchParams.get('from');
    const qTo = searchParams.get('to');
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
  }, [searchParams]);

  const handleFindRoute = async () => {
    if (!from || !to) return;
    if (from === to) { setError("You're already there!"); return; }
    setLoading(true); setError(null); setRoute(null);
    try { setRoute(await getRoute(from, to)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSwap = () => { const t = from; setFrom(to); setTo(t); setRoute(null); };
  const handleReset = () => { setFrom(''); setTo(''); setRoute(null); setError(null); };

  const handleMapClick = (zoneId) => {
    if (!from) setFrom(zoneId);
    else if (!to) setTo(zoneId);
    else { setFrom(zoneId); setTo(''); setRoute(null); }
  };

  const formatTime = (s) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  };

  const fromZone = VENUE_ZONES.find((z) => z.id === from);
  const toZone = VENUE_ZONES.find((z) => z.id === to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-google-gray-900">Navigation</h1>
        <p className="text-sm text-google-gray-500 mt-1">Crowd-aware pathfinding with real-time data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Map */}
        <div className="lg:col-span-7 card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-google-gray-500">
              {!from ? '① Click a zone or select your starting point' : !to ? '② Now select your destination' : '✓ Route calculated'}
            </p>
            {(from || to) && (
              <button onClick={handleReset} className="btn-ghost text-xs flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
          <VenueMap zones={zones} highlightPath={route?.path || []} selectedZone={from || to || null} onZoneClick={handleMapClick} />
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-google-gray-100 text-xs text-google-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-google-green" /> Low</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-google-blue" /> Moderate</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-google-yellow" /> High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-google-red" /> Critical</span>
            {route && (
              <>
                <span className="ml-auto flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-google-green border-2 border-white shadow" /> Start</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-google-red border-2 border-white shadow" /> End</span>
              </>
            )}
          </div>
        </div>

        {/* Route panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-elevated p-5">
            <h2 className="text-base font-semibold text-google-gray-900 mb-4">Plan Your Route</h2>
            <div className="space-y-3 relative">
              <div>
                <label htmlFor="nav-from" className="section-title mb-1.5 block">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-google-green" />
                  <select id="nav-from" value={from} onChange={(e) => { setFrom(e.target.value); setRoute(null); }} className="input-field pl-9">
                    <option value="">Select starting point</option>
                    {VENUE_ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Swap button */}
              {from && to && (
                <div className="flex justify-center -my-1">
                  <button onClick={handleSwap} className="p-2 rounded-full bg-google-gray-50 hover:bg-google-gray-100 transition-colors" aria-label="Swap start and end">
                    <ArrowDownUp className="w-4 h-4 text-google-gray-500" />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="nav-to" className="section-title mb-1.5 block">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-google-red" />
                  <select id="nav-to" value={to} onChange={(e) => { setTo(e.target.value); setRoute(null); }} className="input-field pl-9">
                    <option value="">Select destination</option>
                    {VENUE_ZONES.filter((z) => z.id !== from).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleFindRoute} disabled={!from || !to || loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 py-3">
                <Navigation2 className="w-4 h-4" />
                {loading ? 'Calculating...' : 'Find Route'}
              </button>
            </div>
            {error && <p className="text-sm text-google-red mt-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {error}</p>}
          </div>

          {/* Route result */}
          {route && (
            <div className="card-elevated overflow-hidden">
              {/* Route summary header */}
              <div className="gradient-blue p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/70">Estimated walk time</p>
                    <p className="text-2xl font-bold">{formatTime(route.adjustedTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">{route.steps.length} zones</p>
                    <p className="text-sm font-medium flex items-center gap-1"><Footprints className="w-4 h-4" /> {route.path.length - 1} segments</p>
                  </div>
                </div>
                {route.estimatedTime !== route.adjustedTime && (
                  <p className="text-xs text-white/60 mt-2">Base: {formatTime(route.estimatedTime)} · +{formatTime(route.adjustedTime - route.estimatedTime)} crowd delay</p>
                )}
              </div>

              <div className="p-5">
                {route.hasCrowdedSegments && (
                  <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-xl mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{route.recommendation}</span>
                  </div>
                )}

                {/* Steps timeline */}
                <div className="space-y-0">
                  {route.steps.map((step, i) => (
                    <div key={step.zoneId} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          i === 0 ? 'bg-google-green border-google-green' :
                          i === route.steps.length - 1 ? 'bg-google-red border-google-red' :
                          'bg-white border-google-gray-300'
                        }`}>
                          {(i === 0 || i === route.steps.length - 1) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        {i < route.steps.length - 1 && <div className="w-0.5 h-12 bg-google-gray-200" />}
                      </div>
                      <div className="pb-4 -mt-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-google-gray-900">{step.zoneName}</p>
                          <span className={CROWD_BADGE[step.crowdLevel]}>{step.crowdLevel}</span>
                        </div>
                        <p className="text-xs text-google-gray-400">{step.occupancy.toLocaleString()} / {step.capacity.toLocaleString()}</p>
                        {step.segmentTime > 0 && (
                          <p className="text-xs text-google-blue mt-1 flex items-center gap-1 font-medium">
                            <ChevronRight className="w-3 h-3" /> {formatTime(step.segmentTime)} walk
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!route.hasCrowdedSegments && (
                  <div className="bg-green-50 text-google-green text-xs p-3 rounded-xl mt-2 font-medium">✓ {route.recommendation}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
