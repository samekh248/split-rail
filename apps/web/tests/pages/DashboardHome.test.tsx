import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({ venueId, eventId }: { venueId: string; eventId: string }) => (
    <div data-testid="mock-ledger-page">
      {venueId}:{eventId}
    </div>
  ),
}));

const mockLogout = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const authValue = {
    phase: 'authenticated',
    profile: null,
    justOnboarded: false,
    authView: 'login',
    setAuthView: vi.fn(),
    pending: false,
    error: null,
    clearError: vi.fn(),
    login: vi.fn(),
    onboard: vi.fn(),
    register: vi.fn(),
    createOrganization: vi.fn(),
    logout: mockLogout,
    dismissWelcome: vi.fn(),
  } satisfies AuthContextValue;

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('DashboardHome', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows empty state when no venues', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }),
    );

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
  });

  it('renders ledger when venues exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              id: 'ven-abc',
              name: 'Hall',
              organizationId: 'org-1',
              createdAt: '2026-01-01T00:00:00Z',
            },
          ]),
      }),
    );

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent('ven-abc');
  });

  it('shows loading state', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });
    expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');
  });

  it('shows error with retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: () => Promise.resolve({ detail: 'Server error' }),
      }),
    );

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
