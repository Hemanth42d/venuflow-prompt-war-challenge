import { AlertTriangle, Info, AlertOctagon, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { markAlertRead } from '../lib/api';

const ALERT_STYLES = {
  danger: { bg: 'bg-red-50 border-l-google-red', icon: AlertOctagon, iconColor: 'text-google-red', text: 'text-red-800', iconBg: 'bg-red-100' },
  warning: { bg: 'bg-yellow-50 border-l-yellow-500', icon: AlertTriangle, iconColor: 'text-yellow-600', text: 'text-yellow-800', iconBg: 'bg-yellow-100' },
  info: { bg: 'bg-blue-50 border-l-google-blue', icon: Info, iconColor: 'text-google-blue', text: 'text-blue-800', iconBg: 'bg-blue-100' },
  success: { bg: 'bg-green-50 border-l-google-green', icon: CheckCircle2, iconColor: 'text-google-green', text: 'text-green-800', iconBg: 'bg-green-100' },
};

export default function Alerts({ alerts }) {
  const unread = alerts.filter((a) => !a.read);
  const read = alerts.filter((a) => a.read);

  const handleMarkRead = async (id) => {
    try { await markAlertRead(id); } catch (err) { console.error(err); }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderAlert = (alert) => {
    const style = ALERT_STYLES[alert.type] || ALERT_STYLES.info;
    const Icon = style.icon;

    return (
      <div
        key={alert.id}
        className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${style.bg} ${!alert.read ? 'shadow-sm' : 'opacity-60'} transition-all hover:opacity-100`}
      >
        <div className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold ${style.text}`}>{alert.title}</p>
            <span className="text-[10px] text-google-gray-400 whitespace-nowrap flex-shrink-0">{formatTimestamp(alert.timestamp)}</span>
          </div>
          <p className={`text-xs mt-1 ${style.text} opacity-75`}>{alert.message}</p>
        </div>
        {!alert.read && (
          <button
            onClick={() => handleMarkRead(alert.id)}
            className="text-xs text-google-gray-400 hover:text-google-gray-700 whitespace-nowrap px-2 py-1 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-google-gray-900">Alerts</h1>
          <p className="text-sm text-google-gray-500 mt-1">
            {unread.length > 0 ? `${unread.length} unread notification${unread.length !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unread.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100">
            <Bell className="w-4 h-4 text-google-red" />
            <span className="text-xs font-semibold text-google-red">{unread.length} new</span>
          </div>
        )}
      </div>

      {alerts.length === 0 && (
        <div className="card-elevated p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-google-gray-50 flex items-center justify-center mx-auto mb-4">
            <BellOff className="w-8 h-8 text-google-gray-300" />
          </div>
          <p className="text-google-gray-500 font-medium">No alerts yet</p>
          <p className="text-xs text-google-gray-400 mt-1">The system will notify you of crowd changes and important updates</p>
        </div>
      )}

      {unread.length > 0 && (
        <div>
          <h2 className="section-title mb-3">Unread</h2>
          <div className="space-y-2">{unread.map(renderAlert)}</div>
        </div>
      )}

      {read.length > 0 && (
        <div>
          <h2 className="section-title mb-3">Earlier</h2>
          <div className="space-y-2">{read.map(renderAlert)}</div>
        </div>
      )}
    </div>
  );
}
