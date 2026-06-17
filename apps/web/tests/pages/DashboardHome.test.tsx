import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import { DEFAULT_EVENT_ID } from '@/venue/defaults';
import { getActiveVenueId, setActiveVenueId } from '@/venue/activeVenueStorage';
import { getDashboardPath } from '@/lib/dashboardRoute';

const ADMIN_PROFILE = {
  role: { permissions: { canManagePermissions: true } },
};

const MEMBER_PROFILE = {
  role: { permissions: { canManagePermissions: false } },
};

function mockFetchWithProfile(
  venuesResponse: unknown,
  profile: typeof ADMIN_PROFILE | typeof MEMBER_PROFILE = ADMIN_PROFILE,
  options?: { ok?: boolean; status?: number },
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/users/me')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(profile),
        };
      }
      if (url.includes('/api/venues')) {
        return {
          ok: options?.ok ?? true,
          status: options?.status ?? 200,
          json: () =>
            options?.ok === false
              ? Promise.resolve({ detail: 'Server error' })
              : Promise.resolve(venuesResponse),
        };
      }
      return { ok: true, status: 200, json: () => Promise.resolve({}) };
    }),
  );
}

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({ venueId, eventId }: { venueId: string; eventId: string }) => (
    <div data-testid="mock-ledger-page">
      {venueId}:{eventId}
    </div>
  ),
}));

const mockLogout = vi.fn();

const VENUE_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

const VENUE_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

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
    sessionExpired: false,
  } satisfies AuthContextValue;

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <VenueProvider>{children}</VenueProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('DashboardHome', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
  });

  it('shows empty state when no venues', async () => {
    mockFetchWithProfile([]);

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-add-venue')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-switcher')).not.toBeInTheDocument();
  });

  it('navigates to create page from empty-state CTA', async () => {
    mockFetchWithProfile([]);
    const user = userEvent.setup();

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-add-venue'));
    expect(getDashboardPath()).toBe('/venues/new');
  });

  it('shows header Add venue when user can manage venues', async () => {
    mockFetchWithProfile([VENUE_A, VENUE_B]);
    const user = userEvent.setup();

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    const headerButton = await screen.findByTestId('header-add-venue');
    expect(headerButton).toBeInTheDocument();
    await user.click(headerButton);
    expect(getDashboardPath()).toBe('/venues/new');
  });

  it('hides create affordances for users without manage permission', async () => {
    mockFetchWithProfile([], MEMBER_PROFILE);

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-add-venue')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-add-venue')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Ask someone with venue management access/i),
    ).toBeInTheDocument();
  });

  it('renders VenueSwitcher and ledger with active venue (C6.1, C6.2)', async () => {
    mockFetchWithProfile([VENUE_A, VENUE_B]);

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venue-switcher')).toBeInTheDocument();
    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_A.id}:${DEFAULT_EVENT_ID}`,
    );
  });

  it('resets event to default when venue switches (C6.3)', async () => {
    setActiveVenueId(VENUE_A.id);
    mockFetchWithProfile([VENUE_A, VENUE_B]);

    const user = userEvent.setup();
    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(VENUE_A.id));

    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_B.id}:${DEFAULT_EVENT_ID}`,
      ),
    );
  });

  it('preserves loading, empty, and error states (C6.4)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/users/me')) {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(ADMIN_PROFILE),
          };
        }
        return new Promise(() => {});
      }),
    );

    const { unmount } = render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });
    expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');
    unmount();

    mockFetchWithProfile([], ADMIN_PROFILE, { ok: false, status: 500 });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('does not render ledger when activeVenueId is null (C6.5)', async () => {
    mockFetchWithProfile([]);

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'No venues yet' })).toBeInTheDocument());
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
  });

  it('restores active venue after reload within session (FR-009)', async () => {
    setActiveVenueId(VENUE_B.id);
    mockFetchWithProfile([VENUE_A, VENUE_B]);

    const { unmount } = render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(`${VENUE_B.id}:`),
    );
    unmount();

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(`${VENUE_B.id}:`),
    );
    expect(getActiveVenueId()).toBe(VENUE_B.id);
  });
});
