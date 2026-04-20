import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Navigation from './pages/Navigation';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Admin from './pages/Admin';
import AccessGate from './pages/AccessGate';
import { useAuth } from './lib/auth';
import { subscribeToEvents, subscribeToZones, subscribeToAlerts } from './lib/realtimeService';

function ProtectedApp() {
  const { isAuthenticated, session } = useAuth();
  const [events, setEvents] = useState([]);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    let loaded = { events: false, zones: false };
    const checkLoaded = () => { if (loaded.events && loaded.zones) setLoading(false); };
    const unsubs = [
      subscribeToEvents((data) => { setEvents(data); loaded.events = true; checkLoaded(); }),
      subscribeToZones((data) => { setZones(data); loaded.zones = true; checkLoaded(); }),
      subscribeToAlerts(setAlerts),
    ];
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => { unsubs.forEach((u) => u()); clearTimeout(timeout); };
  }, [isAuthenticated]);

  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const isDashboard = location.pathname === '/dashboard';

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-google-gray-50">
        <Navbar unreadAlerts={0} />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-google-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-google-gray-500 text-sm">Connecting to venue systems...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-google-gray-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-google-blue focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <Navbar unreadAlerts={unreadAlerts} />
      {isDashboard && <Dashboard events={events} zones={zones} alerts={alerts} />}
      {!isDashboard && (
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/events" element={<Events events={events} zones={zones} />} />
            <Route path="/navigation" element={<Navigation zones={zones} />} />
            <Route path="/analytics" element={<Analytics events={events} zones={zones} />} />
            <Route path="/alerts" element={<Alerts alerts={alerts} />} />
            <Route path="/admin" element={session?.isAdmin ? <Admin /> : <Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Access gate at / */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AccessGate />} />
      {/* All protected routes */}
      <Route path="/*" element={isAuthenticated ? <ProtectedApp /> : <Navigate to="/" replace />} />
    </Routes>
  );
}
