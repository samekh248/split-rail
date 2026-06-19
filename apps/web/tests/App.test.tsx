import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { AuthProvider } from '@/auth/AuthContext';
import { EVENT_A } from './fixtures/events';
import { VENUE_A } from './fixtures/venues';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({ venueId, eventId }: { venueId: string; eventId: string }) => (
    <div data-testid="mock-ledger-page">
      {venueId}:{eventId}
    </div>
  ),
}));

function profileWithOrg() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    organization: { id: 'org-1', name: 'Acme' },
    role: { roleName: 'Admin', permissions: { canManagePermissions: true } },
    venueScopes: [],
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function mockAuthenticatedFetch(options?: {
  venues?: typeof VENUE_A[];
  events?: typeof EVENT_A[];
}) {
  const venues = options?.venues ?? [];
  const events = options?.events ?? [];

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/users/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(profileWithOrg()),
        });
      }
      if (url.includes('/venues') && !url.includes('/events')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(venues),
        });
      }
      const eventsMatch = url.match(/\/venues\/([^/]+)\/events$/);
      if (eventsMatch) {
        const venueId = eventsMatch[1]!;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(events.filter((event) => event.venueId === venueId)),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
    }),
  );
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
  });

  it('shows login when unauthenticated', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows accept invite page when unauthenticated on accept-invite route', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'Accept invitation' })).toBeInTheDocument();
  });

  it('renders dashboard empty state when authenticated with no venues', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
  });

  it('renders dashboard overview at root when authenticated with events', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/');
    mockAuthenticatedFetch({
      venues: [VENUE_A],
      events: [EVENT_A],
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByTestId('dashboard-overview')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
  });

  it('renders event workspace route with ledger host', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState(
      {},
      '',
      `/venues/${VENUE_A.id}/events/${EVENT_A.eventId}`,
    );
    mockAuthenticatedFetch({
      venues: [VENUE_A],
      events: [EVENT_A],
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_A.id}:${EVENT_A.eventId}`,
    );
    expect(screen.queryByTestId('dashboard-overview')).not.toBeInTheDocument();
  });

  it('renders settings landing when authenticated on /settings', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/settings');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders team settings when authenticated on /settings/team', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/settings/team');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'Team' })).toBeInTheDocument();
  });

  it('renders organization placeholder when authenticated on /settings/organization', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/settings/organization');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'Coming soon' })).toBeInTheDocument();
    expect(screen.getByText(/Organization settings are not available yet/)).toBeInTheDocument();
  });

  it('renders integrations placeholder when authenticated on /settings/integrations', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/settings/integrations');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'Coming soon' })).toBeInTheDocument();
    expect(screen.getByText(/Integrations settings are not available yet/)).toBeInTheDocument();
  });

  it('renders accept invite for authenticated user on accept-invite route', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/accept-invite?token=abc');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText(/Signed in as/)).toBeInTheDocument();
  });
});
