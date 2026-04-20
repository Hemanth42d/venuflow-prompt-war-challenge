import { useState } from 'react';
import { MapPin, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function AccessGate() {
  const { login } = useAuth();
  const [accessId, setAccessId] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accessId.trim()) { setError('Please enter an Access ID'); triggerShake(); return; }
    const result = login(accessId);
    if (!result.success) { setError(result.error); triggerShake(); }
  };
  const triggerShake = () => { setShaking(true); setTimeout(() => setShaking(false), 500); };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="hidden lg:block">
            <img src="/venue_app.png" alt="VenueFlow" className="w-full max-w-md mx-auto rounded-2xl" />
            <div className="text-center mt-6">
              <h2 className="text-lg font-semibold text-google-gray-800">Real-time Venue Intelligence</h2>
              <p className="text-sm text-google-gray-500 mt-1 max-w-sm mx-auto">Monitor crowd flow, manage events, and optimize the venue experience from one command center.</p>
            </div>
          </div>
          <div className={`w-full max-w-[420px] mx-auto lg:mx-0 ${shaking ? 'animate-shake' : ''}`}>
            <div className="text-center lg:text-left mb-8">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-google-blue flex items-center justify-center"><MapPin className="w-6 h-6 text-white" /></div>
                <span className="text-2xl font-semibold text-google-gray-900">Venue<span className="text-google-blue">Flow</span></span>
              </div>
              <h1 className="text-xl text-google-gray-900">Sign in</h1>
              <p className="text-sm text-google-gray-500 mt-1">Use your Access ID to continue</p>
            </div>
            <div className="border border-google-gray-200 rounded-2xl p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="access-id" className="block text-sm font-medium text-google-gray-700 mb-2">Access ID</label>
                  <input id="access-id" type="text" value={accessId} onChange={(e) => { setAccessId(e.target.value); setError(''); }} placeholder="e.g. VENUE-OPS-001" className="w-full px-4 py-3 rounded-lg border border-google-gray-300 text-sm text-google-gray-900 placeholder:text-google-gray-400 focus:outline-none focus:border-google-blue focus:ring-1 focus:ring-google-blue transition-colors" autoFocus autoComplete="off" spellCheck="false" />
                </div>
                {error && <div className="flex items-start gap-2 text-sm text-google-red"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span></div>}
                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => login('DEMO-ACCESS')} className="text-sm font-medium text-google-blue hover:text-google-darkBlue transition-colors">Try demo</button>
                  <button type="submit" className="bg-google-blue text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-google-darkBlue hover:shadow-md transition-all active:scale-[0.98]">Next <ArrowRight className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /></button>
                </div>
              </form>
            </div>
            <div className="mt-8 text-center lg:text-left">
              <p className="text-xs text-google-gray-400">Authorized personnel only</p>
              <div className="flex items-center justify-center lg:justify-start gap-4 mt-4">
                <span className="w-2 h-2 rounded-full bg-google-blue" /><span className="w-2 h-2 rounded-full bg-google-red" /><span className="w-2 h-2 rounded-full bg-google-yellow" /><span className="w-2 h-2 rounded-full bg-google-green" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="py-4 px-4 border-t border-google-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-google-gray-400">
          <span>VenueFlow 2026</span>
          <div className="flex items-center gap-4"><span>Privacy</span><span>Terms</span></div>
        </div>
      </footer>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}.animate-shake{animation:shake .35s ease-in-out}`}</style>
    </div>
  );
}
