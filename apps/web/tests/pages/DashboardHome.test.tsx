import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import { getActiveVenueId, setActiveVenueId } from '@/venue/activeVenueStorage';
import { getActiveEventId, setActiveEventId } from '@/venue/activeEventStorage';
import { getDashboardPath } from '@/lib/dashboardRoute';

const ADMIN_PROFILE = {
  role: { permissions: { canManagePermissions: true, canViewFinancials: true } },
};

const MEMBER_PROFILE = {
  role: { permissions: { canManagePermissions: false, canViewFinancials: false } },
};

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

const EVENT_A = {
  eventId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  venueId: VENUE_A.id,
  title: 'Show A',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};

const EVENT_B = {
  eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  venueId: VENUE_B.id,
  title: 'Show B',
  eventDate: '2026-09-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};

function mockFetchWithProfile(
  venuesResponse: unknown,
  profile: typeof ADMIN_PROFILE | typeof MEMBER_PROFILE = ADMIN_PROFILE,
  options?: {
    ok?: boolean;
    status?: number;
    eventsByVenue?: Record<string, unknown[]>;
    eventsError?: boolean;
  },
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
      if (url.includes('/api/venues') && url.includes('/events')) {
        if (options?.eventsError) {
          return {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        const venueId = url.match(/\/venues\/([^/]+)\/events/)?.[1];
        const events = venueId ? options?.eventsByVenue?.[venueId] ?? [] : [];
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(events),
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
  });

  it('renders ledger with resolved event id', async () => {
    mockFetchWithProfile([VENUE_A], ADMIN_PROFILE, {
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_A.id}:${EVENT_A.eventId}`,
    );
  });

  it('switches selected event from combobox', async () => {
    const events = [
      EVENT_A,
      {
        ...EVENT_A,
        eventId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        title: 'Show C',
        eventDate: '2026-10-01',
      },
    ];
    mockFetchWithProfile([VENUE_A], ADMIN_PROFILE, {
      eventsByVenue: { [VENUE_A.id]: events },
    });

    const user = userEvent.setup();
    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId('event-option-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'));

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_A.id}:eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`,
      ),
    );
  });

  it('resets event when venue switches', async () => {
    setActiveVenueId(VENUE_A.id);
    setActiveEventId(VENUE_A.id, EVENT_A.eventId!);

    mockFetchWithProfile([VENUE_A, VENUE_B], ADMIN_PROFILE, {
      eventsByVenue: {
        [VENUE_A.id]: [EVENT_A],
        [VENUE_B.id]: [EVENT_B],
      },
    });

    const user = userEvent.setup();
    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(EVENT_A.eventId!),
    );

    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_B.id}:${EVENT_B.eventId}`,
      ),
    );
    expect(getActiveEventId(VENUE_A.id)).toBe(EVENT_A.eventId);
  });

  it('shows events empty state with create CTA', async () => {
    mockFetchWithProfile([VENUE_A], ADMIN_PROFILE, {
      eventsByVenue: { [VENUE_A.id]: [] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-create-event')).toBeInTheDocument();
  });

  it('hides create affordances without financial permission', async () => {
    mockFetchWithProfile([VENUE_A], MEMBER_PROFILE, {
      eventsByVenue: { [VENUE_A.id]: [] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-create-event')).not.toBeInTheDocument();
  });

  it('shows events error with retry', async () => {
    mockFetchWithProfile([VENUE_A], ADMIN_PROFILE, {
      eventsByVenue: { [VENUE_A.id]: [] },
      eventsError: true,
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load events');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('navigates to create page from empty-state venue CTA', async () => {
    mockFetchWithProfile([]);
    const user = userEvent.setup();

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-add-venue'));
    expect(getDashboardPath()).toBe('/venues/new');
  });

  it('restores active venue after reload within session', async () => {
    setActiveVenueId(VENUE_B.id);
    mockFetchWithProfile([VENUE_A, VENUE_B], ADMIN_PROFILE, {
      eventsByVenue: {
        [VENUE_A.id]: [EVENT_A],
        [VENUE_B.id]: [EVENT_B],
      },
    });

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
