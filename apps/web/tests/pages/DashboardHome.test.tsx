import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ShellWorkspaceBarContext,
  useShellWorkspaceBarContextValue,
} from '@/components/shell/ShellWorkspaceBarContext';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({ venueId, eventId }: { venueId: string; eventId: string }) => (
    <div data-testid="mock-ledger-page">
      {venueId}:{eventId}
    </div>
  ),
}));

const mockLogout = vi.fn();
const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
const EVENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';

function ShellTestWrapper({ children }: { children: ReactNode }) {
  const [, setContent] = useState<ReactNode>(null);
  const workspaceBarContextValue = useShellWorkspaceBarContextValue(setContent);
  return (
    <ShellWorkspaceBarContext.Provider value={workspaceBarContextValue}>
      {children}
    </ShellWorkspaceBarContext.Provider>
  );
}

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
      <AuthContext.Provider value={authValue}>
        <VenueProvider>
          <ShellTestWrapper>{children}</ShellTestWrapper>
        </VenueProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('DashboardHome', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  function mockFetch(venues: unknown[], events: unknown[] = []) {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/users/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                role: { permissions: { canViewFinancials: true } },
              }),
          });
        }
        if (url.includes('/api/venues') && url.includes('/events')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(events),
          });
        }
        if (url.includes('/api/venues')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(venues),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );
  }

  it('shows empty state when no venues', async () => {
    mockFetch([]);

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
  });

  it('renders ledger when venues and events exist', async () => {
    sessionStorage.setItem('activeVenueId', VENUE_ID);
    mockFetch(
      [
        {
          id: VENUE_ID,
          name: 'Hall',
          organizationId: 'org-1',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      [
        {
          eventId: EVENT_ID,
          venueId: VENUE_ID,
          title: 'Show',
        },
      ],
    );

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_ID}:${EVENT_ID}`,
    );
  });

  it('shows empty state when venue has no events', async () => {
    sessionStorage.setItem('activeVenueId', VENUE_ID);
    mockFetch([
      {
        id: VENUE_ID,
        name: 'Hall',
        organizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
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
