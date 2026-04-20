import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import App from '../App';

/**
 * Basic render tests for the VenueFlow frontend application.
 */

function renderApp(route = '/') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('renders the access gate on the root route', () => {
    renderApp('/');
    // The access gate should show the access ID input or VenueFlow branding
    expect(
      screen.getByText(/VenueFlow/i) || screen.getByRole('textbox')
    ).toBeTruthy();
  });

  it('redirects unauthenticated users away from dashboard', () => {
    renderApp('/dashboard');
    // Should not show dashboard content when not authenticated
    expect(screen.queryByText('Command Center')).toBeNull();
  });

  it('shows access gate with input field', () => {
    renderApp('/');
    const input = screen.getByRole('textbox') || screen.getByPlaceholderText(/access/i);
    expect(input).toBeTruthy();
  });

  it('login with DEMO-ACCESS grants access to protected routes', () => {
    // Set localStorage to simulate logged-in state
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

    renderApp('/dashboard');
    // Should redirect to dashboard content (not show access gate)
    expect(screen.queryByPlaceholderText(/VENUE-OPS-001/i)).toBeNull();
  });

  it('invalid access ID shows error message', async () => {
    const { container } = renderApp('/');
    const input = screen.getByRole('textbox');
    const form = container.querySelector('form');

    // Type invalid ID and submit
    await import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.change(input, { target: { value: 'INVALID-KEY' } });
      fireEvent.submit(form);
    });

    // Error should be displayed
    expect(screen.getByText(/Invalid/i)).toBeTruthy();
  });
});
