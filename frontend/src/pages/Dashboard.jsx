import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Zap, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight,
  Wifi, Brain, TrendingUp, Gauge, Lightbulb, Activity, Play,
  MoveRight, ChevronRight, Radio, Shield, Megaphone, Route, Wrench,
  Bell, ShieldCheck, BarChart3,
} from 'lucide-react';
import VenueMap from '../components/VenueMap';
import { getIntelligence } from '../lib/api';

/* ── Sparkline ── */
function Sparkline({ data = [], color = '#4285F4', height = 24, width = 64 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <circle cx={width} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

/* ── Vertical KPI Card (for right panel) ── */
function KpiCard({ icon: Icon, label, value, sub, trend, sparkData, sparkColor, iconBg }) {
  const isUp = trend?.startsWith('+');
  return (
    <div className="bg-google-gray-50 rounded-xl border border-google-gray-100 p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-google-gray-900 leading-tight">{value}</p>
          <p className="text-[10px] text-google-gray-500">{label}</p>
        </div>
        <Sparkline data={sparkData} color={sparkColor} width={48} height={20} />
      </div>
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-google-gray-100">
        {sub && <p className="text-[9px] text-google-gray-400">{sub}</p>}
        {trend && (
          <span className={`text-[9px] font-semibold flex items-center gap-0.5 ml-auto ${isUp ? 'text-google-green' : 'text-google-red'}`}>
            {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}{trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
const SEV = {
  critical: 'bg-red-100 text-google-red', high: 'bg-yellow-100 text-yellow-700',
  moderate: 'bg-blue-50 text-google-blue', warning: 'bg-yellow-50 text-yellow-700',
  info: 'bg-blue-50 text-google-blue', neutral: 'bg-google-gray-100 text-google-gray-600',
};
const PRIO = {
  high: 'bg-red-50 text-google-red border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-green-50 text-google-green border-green-200',
};
const S_ICON = { staffing: Shield, routing: Route, operations: Wrench, communication: Megaphone };

function FlowArrow({ direction }) {
  if (direction === 'filling') return <span className="text-google-red text-[10px] font-semibold">▲ In</span>;
  if (direction === 'draining') return <span className="text-google-green text-[10px] font-semibold">▼ Out</span>;
  return <span className="text-google-gray-400 text-[10px]">● Stable</span>;
}

function PhaseBar({ progress, phase }) {
  const c = phase === 'peak' ? 'gradient-red' : phase === 'entry' ? 'gradient-blue' : phase === 'exit' ? 'gradient-yellow' : 'bg-google-gray-200';
  return (
    <div className="h-1 bg-google-gray-100 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{ width: `${progress}%` }} />
    </div>
  );
}

/* ── Dashboard: 3-Column Command Center ── */
export default function Dashboard({ events, zones, alerts }) {
  const [intel, setIntel] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const fetchIntel = useCallback(async () => {
    try { setIntel(await getIntelligence()); } catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    fetchIntel();
    const iv = setInterval(fetchIntel, 5000);
    return () => clearInterval(iv);
  }, [fetchIntel]);

  const totalAtt = intel?.summary?.totalAttendees ?? events.reduce((s, e) => s + (e.currentAttendees || 0), 0);
  const totalCap = intel?.summary?.totalCapacity ?? events.reduce((s, e) => s + (e.maxCapacity || 0), 0);
  const pctAll = intel?.summary?.overallPct ?? (totalCap > 0 ? Math.round((totalAtt / totalCap) * 100) : 0);
  const live = events.filter((e) => e.status === 'live');
  const critical = zones.filter((z) => z.crowdLevel === 'critical' || z.crowdLevel === 'high');
  const unread = alerts.filter((a) => !a.read);

  const handleSim = () => { setSimulating(true); setTimeout(() => { setSimulating(false); fetchIntel(); }, 2000); };

  return (
    <div className="min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[220px_1fr_210px] lg:gap-2 lg:p-2 bg-google-gray-100">

      {/* ═══════════ MOBILE SUMMARY BAR (visible < lg) ═══════════ */}
      <div className="lg:hidden gradient-dark text-white p-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-google-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-google-green" />
            </span>
            <span className="text-[11px] font-medium text-green-300">Live</span>
          </div>
          <p className="text-sm font-bold">Command Center</p>
        </div>
        <div className="flex items-center gap-4 text-center">
          <div><p className="text-lg font-bold">{totalAtt.toLocaleString()}</p><p className="text-[9px] text-white/40">In venue</p></div>
          <div className="w-px h-8 bg-white/15" />
          <div><p className="text-lg font-bold">{pctAll}%</p><p className="text-[9px] text-white/40">Capacity</p></div>
          <div className="w-px h-8 bg-white/15" />
          <div><p className="text-lg font-bold">{critical.length}</p><p className="text-[9px] text-white/40">Alerts</p></div>
        </div>
      </div>

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <aside role="complementary" aria-label="Operational status" className="hidden lg:flex flex-col gradient-dark text-white overflow-y-auto rounded-2xl shadow-lg">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-google-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-google-green" />
            </span>
            <span className="text-[11px] font-medium text-green-300">Operations Active</span>
          </div>
          <h1 className="text-base font-bold leading-tight">Command Center</h1>
          <p className="text-white/35 mt-1 text-[10px] leading-relaxed">AI-powered crowd intelligence</p>
        </div>

        {/* Quick stats */}
        <div className="px-4 pb-3 space-y-2">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">In Venue</p>
            <p className="text-xl font-bold">{totalAtt.toLocaleString()}</p>
            <p className="text-[9px] text-white/30 mt-0.5">of {totalCap.toLocaleString()} capacity</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Utilization</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">{pctAll}%</p>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pctAll >= 85 ? 'bg-google-red' : pctAll >= 65 ? 'bg-google-yellow' : 'bg-google-green'}`} style={{ width: `${pctAll}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
              <p className="text-base font-bold">{live.length}</p>
              <p className="text-[9px] text-white/40">Live</p>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
              <p className="text-base font-bold">{critical.length}</p>
              <p className="text-[9px] text-white/40">Bottlenecks</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/5" />

        {/* Critical alerts */}
        <div className="p-4 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-3 h-3 text-white/40" />
            <p className="text-[9px] text-white/40 uppercase tracking-wider">Alerts</p>
            {unread.length > 0 && <span className="ml-auto text-[9px] bg-google-red text-white px-1.5 py-0.5 rounded-full font-bold">{unread.length}</span>}
          </div>
          <div className="space-y-1.5">
            {unread.slice(0, 3).map((a) => (
              <div key={a.id} className={`text-[10px] p-2 rounded-lg ${a.type === 'danger' ? 'bg-red-500/15 text-red-300' : a.type === 'warning' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-blue-500/15 text-blue-300'}`}>
                <p className="font-medium leading-snug">{a.title}</p>
              </div>
            ))}
            {unread.length === 0 && (
              <div className="flex items-center gap-2 text-white/20 text-[10px] py-3 justify-center">
                <ShieldCheck className="w-3.5 h-3.5" /> All clear
              </div>
            )}
          </div>
          {unread.length > 0 && (
            <Link to="/alerts" className="block mt-2 text-center text-[10px] text-white/30 hover:text-white/60 transition-colors">
              View all →
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-white/20" />
            <span className="text-[9px] text-white/20">Decision Support</span>
          </div>
        </div>
      </aside>

      {/* ═══════════ CENTER COLUMN ═══════════ */}
      <main role="main" aria-label="Dashboard content" className="overflow-y-auto bg-google-gray-50 lg:rounded-2xl">
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">

          {/* Smart Insights + Suggested Actions — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-4 sm:gap-5">
            {/* Smart Insights */}
            {intel?.insights?.length > 0 && (
              <div className="bg-white rounded-2xl border border-google-gray-200 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><Brain className="w-4.5 h-4.5 text-purple-600" /></div>
                  <h2 className="text-base font-semibold text-google-gray-900">Smart Insights</h2>
                  <span className="text-xs text-google-gray-400 ml-auto flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Live</span>
                </div>
                <div className="space-y-3 flex-1">
                  {intel.insights.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${SEV[ins.severity] || SEV.neutral}`}>
                      <span className="text-xl flex-shrink-0">{ins.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{ins.title}</p>
                        <p className="text-xs opacity-75 mt-1 leading-relaxed">{ins.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {intel?.suggestions?.length > 0 && (
              <div className="bg-white rounded-2xl border border-google-gray-200 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center"><Lightbulb className="w-4.5 h-4.5 text-yellow-600" /></div>
                  <h2 className="text-base font-semibold text-google-gray-900">Suggested Actions</h2>
                </div>
                <div className="space-y-3 flex-1">
                  {intel.suggestions.map((s, i) => {
                    const SIcon = S_ICON[s.type] || Lightbulb;
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${PRIO[s.priority]}`}>
                        <div className="flex items-start gap-2.5">
                          <SIcon className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-70" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{s.action}</p>
                            <p className="text-xs opacity-70 mt-1">{s.reason}</p>
                            <p className="text-[11px] opacity-50 mt-1.5 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {s.impact}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={handleSim} disabled={simulating} className="mt-4 w-full btn-secondary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                  <Play className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
                  {simulating ? 'Simulating...' : 'Simulate Recommendations'}
                </button>
              </div>
            )}
          </div>

          {/* Live Venue Map */}
          <div className="bg-white rounded-2xl border border-google-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-google-gray-900">Live Venue Map</h2>
                <p className="text-xs text-google-gray-400 mt-0.5">Hover for details · Click to inspect</p>
              </div>
              <Link to="/navigation" className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5">Navigate <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <VenueMap zones={zones} selectedZone={selectedZone} onZoneClick={setSelectedZone} />
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-google-gray-100">
              <div className="flex items-center gap-4 text-xs text-google-gray-400">
                {[{ l: 'Low', c: 'bg-google-green' }, { l: 'Moderate', c: 'bg-google-blue' }, { l: 'High', c: 'bg-google-yellow' }, { l: 'Critical', c: 'bg-google-red' }].map((x) => (
                  <span key={x.l} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${x.c}`} /> {x.l}</span>
                ))}
              </div>
              <span className="text-xs text-google-gray-400 flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> Real-time</span>
            </div>
          </div>

          {/* Bottleneck + Flow row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Bottleneck Detection */}
            {intel?.bottlenecks?.length > 0 && (
              <div className="bg-white rounded-2xl border border-google-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"><Gauge className="w-4 h-4 text-google-red" /></div>
                  <h2 className="text-base font-semibold text-google-gray-900">Bottlenecks</h2>
                  <span className="badge-red text-xs ml-auto">{intel.bottlenecks.length}</span>
                </div>
                <div className="space-y-2.5">
                  {intel.bottlenecks.slice(0, 3).map((b) => (
                    <div key={b.zoneId} className="p-3 rounded-xl bg-google-gray-50 border border-google-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-google-gray-900">{b.zoneName}</p>
                          <FlowArrow direction={b.flow} />
                        </div>
                        <p className={`text-base font-bold ${b.utilization >= 85 ? 'text-google-red' : b.utilization >= 65 ? 'text-yellow-600' : 'text-google-blue'}`}>{b.utilization}%</p>
                      </div>
                      <p className="text-xs text-google-gray-400">{b.issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movement Flow */}
            {intel?.flowData?.length > 0 && (
              <div className="bg-white rounded-2xl border border-google-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><MoveRight className="w-4 h-4 text-google-blue" /></div>
                  <h2 className="text-base font-semibold text-google-gray-900">Movement Flow</h2>
                </div>
                <div className="space-y-2.5">
                  {intel.flowData.slice(0, 4).map((f) => (
                    <div key={f.zoneId} className="flex items-center justify-between p-3 rounded-lg bg-google-gray-50 border border-google-gray-100">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-google-gray-700">{f.zoneName}</p>
                        <FlowArrow direction={f.direction} />
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-google-green font-medium">+{f.entryRate}/m</span>
                        <span className="text-google-red font-medium">-{f.exitRate}/m</span>
                        <span className={`font-bold ${f.netFlow > 0 ? 'text-google-red' : 'text-google-green'}`}>{f.netFlow > 0 ? '+' : ''}{f.netFlow}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Event Phases */}
          <div className="bg-white rounded-2xl border border-google-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><Zap className="w-4.5 h-4.5 text-google-green" /></div>
                <h2 className="text-base font-semibold text-google-gray-900">Event Phases</h2>
              </div>
              <Link to="/events" className="text-xs text-google-blue hover:underline flex items-center gap-1">All events <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(intel?.eventContext || events.map((e) => ({ ...e, phase: 'unknown', label: e.status, progress: 0, icon: '⏳' })))
                .filter((e) => e.status === 'live' || e.phase === 'entry' || e.phase === 'peak' || e.phase === 'exit')
                .map((evt) => {
                  const p = evt.maxCapacity > 0 ? Math.round((evt.currentAttendees / evt.maxCapacity) * 100) : 0;
                  return (
                    <div key={evt.id} className="p-4 rounded-xl border border-google-gray-100 hover:border-google-blue/20 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{evt.image}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-google-gray-900 truncate">{evt.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs">{evt.icon}</span>
                            <span className="text-xs font-medium text-google-gray-600">{evt.label}</span>
                          </div>
                        </div>
                        <p className={`text-base font-bold flex-shrink-0 ${p >= 85 ? 'text-google-red' : p >= 65 ? 'text-yellow-600' : 'text-google-gray-900'}`}>{p}%</p>
                      </div>
                      <PhaseBar progress={evt.progress} phase={evt.phase} />
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Mobile KPI cards (visible < lg, since right panel is hidden) */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            <KpiCard icon={Users} label="Attendees" value={totalAtt.toLocaleString()} sub={`of ${totalCap.toLocaleString()}`} trend="+12%" sparkData={intel?.trends?.attendees} sparkColor="#4285F4" iconBg="gradient-blue" />
            <KpiCard icon={Gauge} label="Utilization" value={`${pctAll}%`} sub="Capacity" trend="+5%" sparkData={intel?.trends?.utilization} sparkColor="#34A853" iconBg="gradient-green" />
            <KpiCard icon={AlertTriangle} label="Bottlenecks" value={intel?.bottlenecks?.length ?? critical.length} sub={critical.length > 0 ? 'Attention' : 'Clear'} trend={critical.length > 0 ? `${critical.length}` : 'OK'} sparkData={intel?.trends?.alerts} sparkColor={critical.length > 0 ? '#EA4335' : '#34A853'} iconBg={critical.length > 0 ? 'gradient-red' : 'gradient-green'} />
            <KpiCard icon={Zap} label="Live Events" value={live.length} sub={`${events.length - live.length} upcoming`} trend={`${live.length}`} sparkData={intel?.trends?.activeZones} sparkColor="#FBBC05" iconBg="gradient-yellow" />
          </div>

          {/* Mobile alerts (visible < lg) */}
          {unread.length > 0 && (
            <div className="lg:hidden bg-white rounded-2xl border border-google-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-google-gray-900">Alerts</h2>
                <Link to="/alerts" className="text-xs text-google-blue hover:underline">{unread.length} unread</Link>
              </div>
              <div className="space-y-2">
                {unread.slice(0, 3).map((a) => (
                  <div key={a.id} className={`text-xs p-3 rounded-lg ${a.type === 'danger' ? 'bg-red-50 text-red-700' : a.type === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                    <p className="font-medium">{a.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ RIGHT PANEL ═══════════ */}
      <aside role="complementary" aria-label="Key metrics" className="hidden lg:flex flex-col bg-white overflow-y-auto rounded-2xl shadow-lg border border-google-gray-200">
        <div className="p-3 pb-2 border-b border-google-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-google-gray-400" />
            <h2 className="text-[10px] font-semibold text-google-gray-500 uppercase tracking-wider">Key Metrics</h2>
          </div>
        </div>

        <div className="p-3 space-y-2.5 flex-1">
          <KpiCard icon={Users} label="Total Attendees" value={totalAtt.toLocaleString()} sub={`of ${totalCap.toLocaleString()}`} trend="+12%" sparkData={intel?.trends?.attendees} sparkColor="#4285F4" iconBg="gradient-blue" />
          <KpiCard icon={Gauge} label="Utilization" value={`${pctAll}%`} sub="Overall capacity" trend="+5%" sparkData={intel?.trends?.utilization} sparkColor="#34A853" iconBg="gradient-green" />
          <KpiCard icon={AlertTriangle} label="Bottlenecks" value={intel?.bottlenecks?.length ?? critical.length} sub={critical.length > 0 ? 'Zones need attention' : 'All clear'} trend={critical.length > 0 ? `${critical.length} active` : 'Clear'} sparkData={intel?.trends?.alerts} sparkColor={critical.length > 0 ? '#EA4335' : '#34A853'} iconBg={critical.length > 0 ? 'gradient-red' : 'gradient-green'} />
          <KpiCard icon={Zap} label="Live Events" value={live.length} sub={`${events.length - live.length} upcoming`} trend={`${live.length} active`} sparkData={intel?.trends?.activeZones} sparkColor="#FBBC05" iconBg="gradient-yellow" />
        </div>

        {/* Live events mini list */}
        <div className="p-3 pt-0">
          <div className="border-t border-google-gray-100 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-google-gray-400 uppercase tracking-wider font-semibold">Live Now</p>
              <Link to="/events" className="text-[9px] text-google-blue hover:underline">View all</Link>
            </div>
            <div className="space-y-1">
              {live.map((evt) => {
                const p = evt.maxCapacity > 0 ? Math.round((evt.currentAttendees / evt.maxCapacity) * 100) : 0;
                const bc = p >= 85 ? 'bg-google-red' : p >= 65 ? 'bg-google-yellow' : p >= 35 ? 'bg-google-blue' : 'bg-google-green';
                return (
                  <Link key={evt.id} to="/events" className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-google-gray-50 transition-colors">
                    <span className="text-xs">{evt.image}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-google-gray-900 truncate">{evt.name}</p>
                      <div className="mt-0.5 h-1 bg-google-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bc}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold ${p >= 85 ? 'text-google-red' : 'text-google-gray-600'}`}>{p}%</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
