import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, MapPin, Calendar, Users, Building2, ChevronDown } from 'lucide-react';
import { getEvents, getZones, adminCreateEvent, adminUpdateEvent, adminDeleteEvent, adminUpdateZone, adminDeleteZone } from '../lib/api';
import { useAuth } from '../lib/auth';

const EVENT_EMOJIS = ['⚽','🏀','🎾','🏈','🎵','🍔','🛍️','⭐','🎪','🎫','🏆','🎭'];
const ZONE_TYPES = ['arena','concourse','gate','amenity','facility','parking','entrance'];
const STATUSES = ['live','upcoming','ended'];

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-google-gray-100">
          <h2 className="text-base font-semibold text-google-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-google-gray-100 text-google-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-medium text-google-gray-600 mb-1.5">{label}</label>{children}</div>;
}

const inp = "w-full px-3 py-2.5 rounded-lg border border-google-gray-300 text-sm focus:outline-none focus:border-google-blue focus:ring-1 focus:ring-google-blue";

export default function Admin() {
  const { session } = useAuth();
  const [events, setEvents] = useState([]);
  const [zones, setZones] = useState([]);
  const [tab, setTab] = useState('events');
  const [modal, setModal] = useState(null); // { type: 'create-event' | 'edit-event' | 'edit-zone', data }
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const refresh = async () => {
    const [e, z] = await Promise.all([getEvents(), getZones()]);
    setEvents(e); setZones(z);
  };

  useEffect(() => { refresh(); }, []);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleSaveEvent = async () => {
    setLoading(true);
    try {
      if (modal.type === 'create-event') {
        await adminCreateEvent(form);
        showToast('Event created');
      } else {
        await adminUpdateEvent(modal.data.id, form);
        showToast('Event updated');
      }
      setModal(null); refresh();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return;
    try { await adminDeleteEvent(id); showToast('Event deleted'); refresh(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const handleSaveZone = async () => {
    setLoading(true);
    try {
      await adminUpdateZone(modal.data.id, form);
      showToast('Zone updated'); setModal(null); refresh();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleDeleteZone = async (id) => {
    if (!confirm('Delete this zone? Events in this zone may break.')) return;
    try { await adminDeleteZone(id); showToast('Zone deleted'); refresh(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const openCreateEvent = () => {
    setForm({ name: '', sport: '', zoneId: zones[0]?.id || '', startTime: '', endTime: '', status: 'upcoming', maxCapacity: 500, description: '', image: '🎫' });
    setModal({ type: 'create-event' });
  };

  const openEditEvent = (evt) => {
    setForm({ ...evt });
    setModal({ type: 'edit-event', data: evt });
  };

  const openEditZone = (zone) => {
    setForm({ name: zone.name, capacity: zone.capacity, type: zone.type });
    setModal({ type: 'edit-zone', data: zone });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-slide-in ${toast.type === 'error' ? 'gradient-red text-white' : 'gradient-green text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-google-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-google-gray-500 mt-1">Manage events, zones, and venue configuration</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
          <Building2 className="w-3.5 h-3.5" /> {session?.role || 'Admin'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-google-gray-200 p-1 w-fit shadow-sm">
        {[{ id: 'events', label: 'Events', icon: Calendar, count: events.length }, { id: 'zones', label: 'Zones', icon: MapPin, count: zones.length }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-google-blue text-white shadow-sm' : 'text-google-gray-600 hover:bg-google-gray-50'}`}>
            <t.icon className="w-4 h-4" /> {t.label} <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-google-gray-100'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Events Tab */}
      {tab === 'events' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-google-gray-500">{events.length} events configured</p>
            <button onClick={openCreateEvent} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Event</button>
          </div>
          <div className="bg-white rounded-2xl border border-google-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-google-gray-100 bg-google-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-google-gray-500 uppercase">Event</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-google-gray-500 uppercase hidden sm:table-cell">Zone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-google-gray-500 uppercase hidden md:table-cell">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-google-gray-500 uppercase">Capacity</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-google-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const pct = evt.maxCapacity > 0 ? Math.round((evt.currentAttendees / evt.maxCapacity) * 100) : 0;
                  const zone = zones.find((z) => z.id === evt.zoneId);
                  return (
                    <tr key={evt.id} className="border-b border-google-gray-50 hover:bg-google-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{evt.image}</span>
                          <div>
                            <p className="font-medium text-google-gray-900">{evt.name}</p>
                            <p className="text-xs text-google-gray-400">{evt.sport}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-google-gray-600 hidden sm:table-cell">{zone?.name || evt.zoneId}</td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`badge text-[11px] ${evt.status === 'live' ? 'badge-green' : evt.status === 'upcoming' ? 'badge-blue' : 'badge-red'}`}>{evt.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-google-gray-700">{evt.currentAttendees}/{evt.maxCapacity}</span>
                          <span className="text-xs text-google-gray-400">({pct}%)</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditEvent(evt)} className="p-2 rounded-lg hover:bg-google-gray-100 text-google-gray-400 hover:text-google-blue transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteEvent(evt.id)} className="p-2 rounded-lg hover:bg-red-50 text-google-gray-400 hover:text-google-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zones Tab */}
      {tab === 'zones' && (
        <div>
          <p className="text-sm text-google-gray-500 mb-4">{zones.length} zones configured</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => {
              const pct = zone.capacity > 0 ? Math.round(((zone.currentOccupancy || 0) / zone.capacity) * 100) : 0;
              const barColor = pct >= 85 ? 'bg-google-red' : pct >= 65 ? 'bg-google-yellow' : pct >= 35 ? 'bg-google-blue' : 'bg-google-green';
              return (
                <div key={zone.id} className="bg-white rounded-2xl border border-google-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-google-gray-900">{zone.name}</p>
                      <p className="text-xs text-google-gray-400 capitalize">{zone.type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditZone(zone)} className="p-1.5 rounded-lg hover:bg-google-gray-100 text-google-gray-400 hover:text-google-blue transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteZone(zone.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-google-gray-400 hover:text-google-red transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-google-gray-600"><Users className="w-3.5 h-3.5 inline mr-1" />{(zone.currentOccupancy || 0).toLocaleString()} / {zone.capacity.toLocaleString()}</span>
                    <span className={`font-bold ${pct >= 85 ? 'text-google-red' : pct >= 65 ? 'text-yellow-600' : 'text-google-gray-700'}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-google-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-google-gray-400 mt-2">ID: {zone.id}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <Modal open={modal?.type === 'create-event' || modal?.type === 'edit-event'} onClose={() => setModal(null)} title={modal?.type === 'create-event' ? 'Create Event' : 'Edit Event'}>
        <div className="space-y-4">
          <Field label="Event Name"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="e.g. Championship Finals" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sport / Category"><input value={form.sport || ''} onChange={(e) => setForm({ ...form, sport: e.target.value })} className={inp} placeholder="e.g. Football" /></Field>
            <Field label="Emoji">
              <div className="flex flex-wrap gap-1.5">
                {EVENT_EMOJIS.map((em) => (
                  <button key={em} type="button" onClick={() => setForm({ ...form, image: em })} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.image === em ? 'bg-google-blue/10 ring-2 ring-google-blue' : 'bg-google-gray-50 hover:bg-google-gray-100'}`}>{em}</button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Zone">
            <select value={form.zoneId || ''} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className={inp}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Time"><input type="datetime-local" value={form.startTime?.slice(0, 16) || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inp} /></Field>
            <Field label="End Time"><input type="datetime-local" value={form.endTime?.slice(0, 16) || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inp} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Max Capacity"><input type="number" value={form.maxCapacity || ''} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} className={inp} /></Field>
            <Field label="Status">
              <select value={form.status || 'upcoming'} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inp}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description"><textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inp} h-20 resize-none`} placeholder="Event description..." /></Field>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
            <button onClick={handleSaveEvent} disabled={loading || !form.name} className="btn-primary flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Event'}</button>
          </div>
        </div>
      </Modal>

      {/* Edit Zone Modal */}
      <Modal open={modal?.type === 'edit-zone'} onClose={() => setModal(null)} title={`Edit Zone: ${modal?.data?.name || ''}`}>
        <div className="space-y-4">
          <Field label="Zone Name"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Capacity"><input type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inp} /></Field>
            <Field label="Type">
              <select value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>
                {ZONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
            <button onClick={handleSaveZone} disabled={loading || !form.name} className="btn-primary flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Zone'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
