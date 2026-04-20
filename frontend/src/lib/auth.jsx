import { createContext, useContext, useState, useCallback } from 'react';

const VALID_IDS = {
  'VENUE-OPS-001': { role: 'Operations', level: 'admin' },
  'ADMIN-2026': { role: 'Administrator', level: 'admin' },
  'STAFF-ALPHA': { role: 'Staff', level: 'staff' },
  'DEMO-ACCESS': { role: 'Demo User', level: 'demo' },
  'SUPERADMIN': { role: 'Super Admin', level: 'superadmin' },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem('vf_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accessId && VALID_IDS[parsed.accessId]) return parsed;
      } catch (e) { /* ignore */ }
    }
    return null;
  });

  const login = useCallback((accessId) => {
    const upper = accessId.trim().toUpperCase();
    const match = VALID_IDS[upper];
    if (!match) return { success: false, error: 'Invalid Access ID. Please try again.' };

    const sess = {
      accessId: upper,
      role: match.role,
      level: match.level,
      isDemo: match.level === 'demo',
      isAdmin: match.level === 'admin' || match.level === 'superadmin',
      isSuperAdmin: match.level === 'superadmin',
      loginAt: Date.now(),
    };
    localStorage.setItem('vf_session', JSON.stringify(sess));
    setSession(sess);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vf_session');
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
