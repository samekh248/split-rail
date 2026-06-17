import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { AuthProvider } from '@/auth/AuthContext';

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

function mockAuthenticatedFetch() {
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
    window.history.pushState({}, '', '/?venueId=ven-123&eventId=evt-456');
    mockAuthenticatedFetch();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
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
