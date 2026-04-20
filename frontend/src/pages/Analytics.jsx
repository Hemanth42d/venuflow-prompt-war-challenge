import { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity, BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getAnalyticsSummary } from '../lib/api';

const CROWD_BAR = { critical: 'bg-google-red', high: 'bg-google-yellow', moderate: 'bg-google-blue', low: 'bg-google-green' };
const CROWD_TEXT = { critical: 'text-google-red', high: 'text-yellow-600', moderate: 'text-google-blue', low: 'text-google-green' };

function MiniSparkline({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const bars = [35, 55, 40, 70, 60, pct, Math.min(pct + 10, 100)];
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div key={i} className={`w-1.5 rounded-full transition-all duration-500 ${i === bars.length - 1 ? 'bg-google-blue' : 'bg-google-gray-200'}`} style={{ height: `${Math.max(h, 8)}%` }} />
      ))}
    </div>
  );
}

export default function Analytics({ events, zones }) {
  const [loading, setLoading] = useState(false);

  const totalAttendees = events.reduce((s, e) => s + (e.currentAttendees || 0), 0);
  const totalCapacity = events.reduce((s, e) => s + (e.maxCapacity || 0), 0);
  const overallPct = totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0;

  const zoneStats = zones.filter((z) => z.capacity > 0).map((z) => ({
    ...z, utilization: Math.round(((z.currentOccupancy || 0) / z.capacity) * 100),
  })).sort((a, b) => b.utilization - a.utilization);

  const eventStats = events.map((e) => ({
    ...e, pct: e.maxCapacity > 0 ? Math.round((e.currentAttendees / e.maxCapacity) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);

  const activeZones = zones.filter((z) => (z.currentOccupancy || 0) > 0).length;
  const crowdedZones = zones.filter((z) => z.crowdLevel === 'critical' || z.crowdLevel === 'high').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-google-gray-900">Analytics</h1>
          <p className="text-sm text-google-gray-500 mt-1">Real-time venue performance and crowd insights</p>
        </div>
        <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Attendees', value: totalAttendees.toLocaleString(), sub: `of ${totalCapacity.toLocaleString()}`, color: 'text-google-blue', bg: 'bg-blue-50', trend: '+12%', up: true },
          { icon: Activity, label: 'Utilization', value: `${overallPct}%`, sub: 'Overall capacity', color: 'text-google-green', bg: 'bg-green-50', trend: '+5%', up: true },
          { icon: TrendingUp, label: 'Active Zones', value: activeZones, sub: `of ${zones.length} total`, color: 'text-google-yellow', bg: 'bg-yellow-50', trend: `${activeZones}/${zones.length}`, up: true },
          { icon: BarChart3, label: 'Crowded Zones', value: crowdedZones, sub: crowdedZones > 0 ? 'Need attention' : 'All clear', color: 'text-google-red', bg: 'bg-red-50', trend: crowdedZones > 0 ? 'Alert' : 'OK', up: crowdedZones === 0 },
        ].map((card) => (
          <div key={card.label} className="card-elevated p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${card.up ? 'text-google-green' : 'text-google-red'}`}>
                {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {card.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-google-gray-900">{card.value}</p>
            <p className="text-xs text-google-gray-500 mt-0.5">{card.label}</p>
            <p className="text-[11px] text-google-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Overall capacity gauge */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-google-gray-900">Overall Venue Capacity</h2>
          <span className={`text-sm font-bold ${overallPct >= 85 ? 'text-google-red' : overallPct >= 65 ? 'text-yellow-600' : 'text-google-green'}`}>{overallPct}%</span>
        </div>
        <div className="h-4 bg-google-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${overallPct >= 85 ? 'gradient-red' : overallPct >= 65 ? 'gradient-yellow' : 'gradient-green'}`} style={{ width: `${overallPct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-google-gray-400">
          <span>0%</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-green" /> Safe</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-yellow" /> Busy</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-google-red" /> Full</span>
          </span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Zone utilization */}
        <div className="card-elevated p-5">
          <h2 className="text-base font-semibold text-google-gray-900 mb-4">Zone Utilization</h2>
          <div className="space-y-4">
            {zoneStats.map((z) => (
              <div key={z.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-google-gray-700">{z.name}</span>
                    <span className={`text-[10px] font-semibold ${CROWD_TEXT[z.crowdLevel || 'low']}`}>
                      {z.crowdLevel || 'low'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-google-gray-400">{(z.currentOccupancy || 0).toLocaleString()} / {z.capacity.toLocaleString()}</span>
                    <span className="text-xs font-bold text-google-gray-900 w-10 text-right">{z.utilization}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-google-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${CROWD_BAR[z.crowdLevel || 'low']}`} style={{ width: `${z.utilization}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event attendance */}
        <div className="card-elevated p-5">
          <h2 className="text-base font-semibold text-google-gray-900 mb-4">Event Attendance</h2>
          <div className="space-y-4">
            {eventStats.map((e) => {
              const barColor = e.pct >= 85 ? 'bg-google-red' : e.pct >= 65 ? 'bg-google-yellow' : e.pct >= 35 ? 'bg-google-blue' : 'bg-google-green';
              return (
                <div key={e.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{e.image}</span>
                      <div>
                        <span className="text-sm font-medium text-google-gray-700">{e.name}</span>
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${e.status === 'live' ? 'bg-green-50 text-google-green' : 'bg-blue-50 text-google-blue'}`}>{e.status}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-google-gray-900">{e.pct}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-google-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${e.pct}%` }} />
                    </div>
                    <span className="text-[11px] text-google-gray-400 min-w-[80px] text-right">{(e.currentAttendees || 0).toLocaleString()} / {e.maxCapacity.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zone type breakdown */}
      <div className="card-elevated p-5">
        <h2 className="text-base font-semibold text-google-gray-900 mb-4">Zone Type Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { type: 'arena', emoji: '🏟️' }, { type: 'concourse', emoji: '🚶' }, { type: 'gate', emoji: '🚪' },
            { type: 'amenity', emoji: '🍔' }, { type: 'facility', emoji: '🏥' }, { type: 'entrance', emoji: '🎫' },
          ].map(({ type, emoji }) => {
            const typeZones = zones.filter((z) => z.type === type);
            const totalOcc = typeZones.reduce((s, z) => s + (z.currentOccupancy || 0), 0);
            const totalCap = typeZones.reduce((s, z) => s + (z.capacity || 0), 0);
            const pct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;
            return (
              <div key={type} className="text-center p-4 rounded-xl bg-google-gray-50 hover:bg-google-gray-100 transition-colors">
                <span className="text-2xl">{emoji}</span>
                <p className="text-xs text-google-gray-500 capitalize mt-2 font-medium">{type}</p>
                <p className="text-xl font-bold text-google-gray-900 mt-1">{pct}%</p>
                <p className="text-[10px] text-google-gray-400">{totalOcc.toLocaleString()} / {totalCap.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
