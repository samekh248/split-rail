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
    role: { roleName: 'Admin', permissions: {} },
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

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
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

  it('renders dashboard empty state when authenticated with no venues', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/?venueId=ven-123&eventId=evt-456');

    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(profileWithOrg()),
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        }),
    );

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
  });
});
