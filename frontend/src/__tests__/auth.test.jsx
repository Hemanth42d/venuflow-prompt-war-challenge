import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth';

function TestConsumer() {
  const { session, login, logout, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</span>
      <span data-testid="role">{session?.role || 'none'}</span>
      <button data-testid="login-valid" onClick={() => login('DEMO-ACCESS')}>Login Valid</button>
      <button data-testid="login-invalid" onClick={() => {
        const result = login('INVALID-ID');
        document.querySelector('[data-testid="login-result"]').textContent = result.success ? 'success' : result.error;
      }}>Login Invalid</button>
      <button data-testid="logout" onClick={logout}>Logout</button>
      <span data-testid="login-result"></span>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Auth - Login', () => {
  it('login with valid ID returns success and sets session', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');

    act(() => {
      fireEvent.click(screen.getByTestId('login-valid'));
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('role').textContent).toBe('Demo User');
  });

  it('login with invalid ID returns error', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('login-invalid'));
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('login-result').textContent).toContain('Invalid');
  });
});

describe('Auth - Logout', () => {
  it('logout clears session', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('login-valid'));
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');

    act(() => {
      fireEvent.click(screen.getByTestId('logout'));
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(localStorage.getItem('vf_session')).toBeNull();
  });
});

describe('Auth - Session Persistence', () => {
  it('session persists in localStorage after login', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('login-valid'));
    });

    const stored = localStorage.getItem('vf_session');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored);
    expect(parsed.accessId).toBe('DEMO-ACCESS');
    expect(parsed.role).toBe('Demo User');
  });

  it('session is restored from localStorage on mount', () => {
    // Pre-set session in localStorage
    const sess = {
      accessId: 'DEMO-ACCESS',
      role: 'Demo User',
      level: 'demo',
      isDemo: true,
      isAdmin: false,
      isSuperAdmin: false,
      loginAt: Date.now(),
    };
    localStorage.setItem('vf_session', JSON.stringify(sess));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('role').textContent).toBe('Demo User');
  });
});
