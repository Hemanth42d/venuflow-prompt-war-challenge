import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, CalendarDays, MapPin, BarChart3, Bell, Radio, Menu, X, LogOut, Shield, Settings } from 'lucide-react';
import { useAuth } from '../lib/auth';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/navigation', label: 'Navigate', icon: MapPin },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const adminLink = { to: '/admin', label: 'Admin', icon: Settings };

export default function Navbar({ unreadAlerts = 0 }) {
  const { session, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <nav className="glass border-b border-google-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Status */}
          <div className="flex items-center gap-4">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center shadow-md shadow-blue-200/50 group-hover:shadow-lg group-hover:shadow-blue-200/70 transition-all">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-google-gray-900">
                  Venue<span className="text-google-blue">Flow</span>
                </span>
              </div>
            </NavLink>

            {/* Live status pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
              <span className="relative flex h-2 w-2">
                <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-google-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-google-green" />
              </span>
              <span className="text-[11px] font-medium text-google-green">Live</span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 bg-google-gray-50 rounded-full p-1">
            {[...links, ...(session?.isAdmin ? [adminLink] : [])].map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-white text-google-blue shadow-sm' : 'text-google-gray-600 hover:text-google-gray-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-google-gray-500">
              <Radio className="w-3.5 h-3.5" />
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            {/* Access level badge */}
            {session && (
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium ${
                session.isDemo
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-google-lightBlue text-google-blue border border-blue-200'
              }`}>
                <Shield className="w-3 h-3" />
                {session.role}
                {session.isDemo && <span className="text-[9px] opacity-60">DEMO</span>}
              </div>
            )}

            {/* Alerts */}
            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                `relative p-2.5 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-google-lightBlue text-google-blue' : 'text-google-gray-600 hover:bg-google-gray-100'
                }`
              }
              aria-label={`Alerts${unreadAlerts > 0 ? `, ${unreadAlerts} unread` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-google-red text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </NavLink>

            {/* Exit session */}
            <button
              onClick={logout}
              className="p-2.5 rounded-full text-google-gray-400 hover:text-google-red hover:bg-red-50 transition-all"
              aria-label="Exit session"
              title="Exit Session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-full hover:bg-google-gray-100 text-google-gray-600"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-google-gray-200/60 bg-white px-4 py-3 space-y-1">
          {/* Mobile access badge */}
          {session && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl mb-2 ${
              session.isDemo ? 'bg-yellow-50 text-yellow-700' : 'bg-google-lightBlue text-google-blue'
            }`}>
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium">{session.role}</span>
              {session.isDemo && <span className="text-[10px] ml-auto opacity-60">DEMO MODE</span>}
            </div>
          )}
          {[...links, ...(session?.isAdmin ? [adminLink] : [])].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-google-lightBlue text-google-blue' : 'text-google-gray-700 hover:bg-google-gray-50'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => { setMobileOpen(false); logout(); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-google-red hover:bg-red-50 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Exit Session
          </button>
        </div>
      )}
    </nav>
  );
}
