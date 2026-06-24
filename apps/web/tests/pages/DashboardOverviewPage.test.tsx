import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardOverviewPage } from '@/pages/DashboardOverviewPage';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { VenueProvider } from '@/venue/VenueContext';
import { buildEventWorkspacePath } from '@/lib/appRoute';
import { getDashboardPath } from '@/lib/dashboardRoute';
import * as eventWorkspaceRoute from '@/lib/eventWorkspaceRoute';
import type { DashboardResponse, EventCardDto, EventResponse, FinancialHealthDto } from '@/types/generated-api';
import { EVENT_A, EVENT_B } from '../fixtures/events';
import { VENUE_A, VENUE_B } from '../fixtures/venues';
import {
  mockWorkspaceFetch,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';
import { setActiveVenueId } from '@/venue/activeVenueStorage';

const mockLogout = vi.fn();

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
    completeAcceptInvitation: vi.fn(),
    sessionExpired: false,
  } satisfies AuthContextValue;

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <VenueProvider>
          <AppShell>{children}</AppShell>
        </VenueProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function eventOn(date: string, overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    ...EVENT_A,
    eventId: overrides.eventId ?? EVENT_A.eventId,
    eventDate: date,
    title: overrides.title ?? EVENT_A.title,
    ...overrides,
  };
}

function cardOn(date: string, overrides: Partial<EventCardDto> = {}): EventCardDto {
  return {
    eventId: overrides.eventId ?? EVENT_A.eventId,
    venueId: overrides.venueId ?? VENUE_A.id,
    title: overrides.title ?? EVENT_A.title,
    eventDate: date,
    status: overrides.status ?? 'PRE_SHOW',
    isBudgetLocked: overrides.isBudgetLocked ?? false,
    qboTagName: overrides.qboTagName ?? '',
    settlementPdfAvailable: overrides.settlementPdfAvailable ?? false,
    isPinned: overrides.isPinned ?? false,
    hasVarianceConcern: overrides.hasVarianceConcern ?? false,
    unmappedCount: overrides.unmappedCount ?? 0,
    lastSyncedAt: overrides.lastSyncedAt ?? null,
    ...overrides,
  };
}

function defaultFinancialHealth(overrides: Partial<FinancialHealthDto> = {}): FinancialHealthDto {
  return {
    weekStart: '2026-06-16',
    weekEnd: '2026-06-22',
    projectedNetGross: '5000.00',
    actualQboDeposits: '4200.00',
    variance: '800.00',
    ...overrides,
  };
}

function dashboardForVenue(
  venueId: string,
  partitions: Partial<Omit<DashboardResponse, 'venueId'>>,
): DashboardResponse {
  return {
    venueId,
    tonightEvents: partitions.tonightEvents ?? [],
    pinnedEvents: partitions.pinnedEvents ?? [],
    upcomingEvents: partitions.upcomingEvents ?? [],
    recentEvents: partitions.recentEvents ?? [],
    actionCenter: partitions.actionCenter ?? {
      totalUnmappedCount: 0,
      eventsWithUnmapped: [],
    },
    financialHealth: partitions.financialHealth ?? defaultFinancialHealth(),
  };
}

describe('DashboardOverviewPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.spyOn(eventWorkspaceRoute, 'navigateToEventWorkspace').mockImplementation(() => {});
  });

  it('shows overview at root when events exist without redirecting to workspace', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [eventOn(offsetDate(1), { title: 'Upcoming Show' })] },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('dashboard-overview')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-workspace-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('event-ledger-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(eventWorkspaceRoute.navigateToEventWorkspace).not.toHaveBeenCalled();
  });

  it('renders zones from dashboard fixture partitions', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          pinnedEvents: [cardOn(offsetDate(1), { eventId: '11111111-1111-1111-1111-111111111111', title: 'Pinned Show' })],
          upcomingEvents: [cardOn(offsetDate(2), { eventId: '22222222-2222-2222-2222-222222222222', title: 'Upcoming Show' })],
          recentEvents: [cardOn(offsetDate(-2), { eventId: '33333333-3333-3333-3333-333333333333', title: 'Recent Show' })],
        }),
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await screen.findByTestId('dashboard-overview');
    expect(screen.getByText('Pinned Show')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Show')).toBeInTheDocument();
    expect(screen.getByText('Recent Show')).toBeInTheDocument();
  });

  it('renders unassigned transactions banner when action center count > 0', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          upcomingEvents: [cardOn(offsetDate(2), { title: 'Mapped Show' })],
          actionCenter: {
            totalUnmappedCount: 2,
            eventsWithUnmapped: [
              {
                eventId: '22222222-2222-2222-2222-222222222222',
                venueId: VENUE_A.id,
                title: 'Mapped Show',
                eventDate: offsetDate(2),
                unmappedCount: 2,
              },
            ],
          },
        }),
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('unassigned-transactions-banner')).toHaveTextContent(
      '2 unassigned transactions detected',
    );
  });

  it('shows empty state when no venues', async () => {
    mockWorkspaceFetch({ venues: [] });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-add-venue')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('shows no-events empty state when all partitions empty', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {}),
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('dashboard-no-events')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-create-event')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('shows events error state with retry', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardError: true,
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Unable to load events. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('hides empty-state add venue for restricted user with zero venues', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [],
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-add-venue')).not.toBeInTheDocument();
  });

  it('shows tonight hero only when events are dated today', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [
          eventOn(offsetDate(0), {
            eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            title: 'Tonight Show',
          }),
          eventOn(offsetDate(1), {
            eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            title: 'Tomorrow Show',
          }),
        ],
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const hero = await screen.findByTestId('dashboard-zone-tonight');
    expect(within(hero).getByText('Tonight Show')).toBeInTheDocument();
    expect(within(hero).queryByText('Tomorrow Show')).not.toBeInTheDocument();
  });

  it('hides tonight hero when tonightEvents empty', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          upcomingEvents: [cardOn(offsetDate(1), { title: 'Tomorrow Only' })],
        }),
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await screen.findByTestId('dashboard-overview');
    expect(screen.queryByTestId('dashboard-zone-tonight')).not.toBeInTheDocument();
  });

  it('renders zones in pinned, upcoming, recent order with empty messages when no tonight events', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [eventOn(offsetDate(1), { title: 'Soon' })],
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await screen.findByTestId('dashboard-overview');

    const zones = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(zones).toEqual(['Pinned events', 'Upcoming events', 'Recent events']);

    expect(screen.getByText('No pinned events')).toBeInTheDocument();
    expect(screen.getByText('No recent events')).toBeInTheDocument();
    expect(screen.getByText('Soon')).toBeInTheDocument();
  });

  it('pin toggle calls PUT pin endpoint', async () => {
    const upcoming = eventOn(offsetDate(1), {
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Pin Me',
    });
    const mock = mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [upcoming] },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await screen.findByTestId('dashboard-overview');
    await user.click(screen.getByTestId('event-card-pin-dddddddd-dddd-dddd-dddd-dddddddddddd'));

    await waitFor(() => {
      expect(mock.pinRequests.some((request) => request.method === 'PUT')).toBe(true);
    });
  });

  it('pinned state survives dashboard refetch without localStorage', async () => {
    const upcoming = eventOn(offsetDate(1), {
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Pin Me',
    });
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [upcoming] },
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          upcomingEvents: [cardOn(offsetDate(1), { eventId: upcoming.eventId!, title: 'Pin Me', isPinned: true })],
          pinnedEvents: [cardOn(offsetDate(1), { eventId: upcoming.eventId!, title: 'Pin Me', isPinned: true })],
        }),
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const pinnedSection = await screen.findByTestId('dashboard-zone-pinned');
    expect(within(pinnedSection).getByText('Pin Me')).toBeInTheDocument();
    expect(localStorage.getItem('split-rail:pinned-events')).toBeNull();
  });

  it('unpin removes event from pinned zone after refetch', async () => {
    const eventId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const mock = mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          upcomingEvents: [cardOn(offsetDate(1), { eventId, title: 'Pin Me', isPinned: true })],
          pinnedEvents: [cardOn(offsetDate(1), { eventId, title: 'Pin Me', isPinned: true })],
        }),
      },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const pinnedSection = await screen.findByTestId('dashboard-zone-pinned');
    expect(within(pinnedSection).getByText('Pin Me')).toBeInTheDocument();

    await user.click(within(pinnedSection).getByTestId(`event-card-pin-${eventId}`));

    await waitFor(() => {
      expect(mock.pinRequests.some((request) => request.method === 'DELETE')).toBe(true);
    });
    await waitFor(() => {
      expect(within(pinnedSection).getByText('No pinned events')).toBeInTheDocument();
    });
  });

  it('pin toggle updates UI before network completes', async () => {
    let resolvePin: (() => void) | undefined;
    const pinPromise = new Promise<void>((resolve) => {
      resolvePin = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/users/me')) {
          return { ok: true, status: 200, json: () => Promise.resolve({ role: { permissions: {} } }) };
        }
        if (url.includes('/venues') && !url.includes('/events') && !url.includes('/dashboard')) {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve([VENUE_A]),
          };
        }
        if (url.includes('/dashboard')) {
          return {
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve(
                dashboardForVenue(VENUE_A.id, {
                  upcomingEvents: [
                    cardOn(offsetDate(1), {
                      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
                      title: 'Pin Me',
                    }),
                  ],
                }),
              ),
          };
        }
        if (url.includes('/pin') && init?.method === 'PUT') {
          await pinPromise;
          return { ok: true, status: 204, json: () => Promise.resolve(undefined) };
        }
        return { ok: true, status: 200, json: () => Promise.resolve({}) };
      }),
    );

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const pinnedSection = await screen.findByTestId('dashboard-zone-pinned');
    await user.click(screen.getByTestId('event-card-pin-dddddddd-dddd-dddd-dddd-dddddddddddd'));

    await waitFor(() => {
      expect(within(pinnedSection).getByText('Pin Me')).toBeInTheDocument();
    });

    resolvePin?.();
  });

  it('failed pin reverts optimistic state and shows error', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [
          eventOn(offsetDate(1), {
            eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            title: 'Pin Me',
          }),
        ],
      },
      pinError: true,
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const pinnedSection = await screen.findByTestId('dashboard-zone-pinned');
    await user.click(screen.getByTestId('event-card-pin-dddddddd-dddd-dddd-dddd-dddddddddddd'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-pin-error')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(within(pinnedSection).getByText('No pinned events')).toBeInTheDocument();
    });
  });

  it('navigates to workspace from quick link', async () => {
    const preShow = eventOn(offsetDate(1), {
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      status: 'PRE_SHOW',
      isBudgetLocked: false,
    });
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [preShow] },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await user.click(
      await screen.findByTestId('event-card-link-deal-dddddddd-dddd-dddd-dddd-dddddddddddd'),
    );

    expect(eventWorkspaceRoute.navigateToEventWorkspace).toHaveBeenCalledWith(
      VENUE_A.id,
      preShow.eventId,
      'deal',
    );
  });

  it('navigates to workspace when card body is activated', async () => {
    const preShow = eventOn(offsetDate(1), {
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Card Nav',
    });
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [preShow] },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const card = await screen.findByTestId('event-card-dddddddd-dddd-dddd-dddd-dddddddddddd');
    await user.click(within(card).getByText('Card Nav'));

    expect(eventWorkspaceRoute.navigateToEventWorkspace).toHaveBeenCalledWith(
      VENUE_A.id,
      preShow.eventId,
    );
  });

  it('does not auto-redirect to workspace when events exist', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [eventOn(offsetDate(1), { eventId: EVENT_A.eventId })] },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await screen.findByTestId('dashboard-overview');
    expect(window.location.pathname).toBe('/');
    expect(window.location.pathname).not.toBe(
      buildEventWorkspacePath(VENUE_A.id, EVENT_A.eventId!),
    );
  });

  it('venue switch loads new dashboard fixture', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          upcomingEvents: [cardOn(offsetDate(1), { title: 'Venue A Show' })],
        }),
        [VENUE_B.id]: dashboardForVenue(VENUE_B.id, {
          upcomingEvents: [
            cardOn(offsetDate(2), {
              eventId: EVENT_B.eventId,
              venueId: VENUE_B.id,
              title: 'Venue B Show',
            }),
          ],
        }),
      },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Venue A Show')).toBeInTheDocument();
    expect(screen.getByText('Venue B Show')).toBeInTheDocument();

    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    expect(await screen.findByText('Venue B Show')).toBeInTheDocument();
    expect(screen.queryByText('Venue A Show')).not.toBeInTheDocument();
  });

  it('pins from venue A not shown after switching to venue B', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          pinnedEvents: [cardOn(offsetDate(1), { title: 'Venue A Pin' })],
        }),
        [VENUE_B.id]: dashboardForVenue(VENUE_B.id, {
          upcomingEvents: [
            cardOn(offsetDate(2), {
              eventId: EVENT_B.eventId,
              venueId: VENUE_B.id,
              title: 'Venue B Show',
            }),
          ],
        }),
      },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Venue A Pin')).toBeInTheDocument();

    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    expect(await screen.findByText('Venue B Show')).toBeInTheDocument();
    expect(screen.queryByText('Venue A Pin')).not.toBeInTheDocument();
  });

  it('aggregates events from all venues by default', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      dashboardByVenue: {
        [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
          upcomingEvents: [cardOn(offsetDate(1), { title: 'Venue A Show' })],
        }),
        [VENUE_B.id]: dashboardForVenue(VENUE_B.id, {
          upcomingEvents: [
            cardOn(offsetDate(2), {
              eventId: EVENT_B.eventId,
              venueId: VENUE_B.id,
              title: 'Venue B Show',
            }),
          ],
        }),
      },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Venue A Show')).toBeInTheDocument();
    expect(screen.getByText('Venue B Show')).toBeInTheDocument();
    expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('All Venues');
  });

  it('navigates to create page from empty-state venue CTA', async () => {
    mockWorkspaceFetch({ venues: [] });
    const user = userEvent.setup();

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-add-venue'));
    expect(getDashboardPath()).toBe('/venues/new');
  });

  describe('financial health widget', () => {
    it('renders financial health widget for single-venue dashboard', async () => {
      setActiveVenueId(VENUE_A.id!);
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            upcomingEvents: [cardOn(offsetDate(1), { title: 'Upcoming Show' })],
          }),
        },
      });

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      expect(await screen.findByTestId('financial-health-widget')).toBeInTheDocument();
      expect(screen.getByTestId('financial-health-projected')).toHaveTextContent('$5,000.00');
    });

    it('hides financial health widget in all-venues view', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A, VENUE_B],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            upcomingEvents: [cardOn(offsetDate(1), { title: 'Venue A Show' })],
          }),
          [VENUE_B.id]: dashboardForVenue(VENUE_B.id, {
            upcomingEvents: [
              cardOn(offsetDate(2), {
                eventId: EVENT_B.eventId,
                venueId: VENUE_B.id,
                title: 'Venue B Show',
              }),
            ],
          }),
        },
      });

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      await screen.findByTestId('dashboard-overview');
      expect(screen.queryByTestId('financial-health-widget')).not.toBeInTheDocument();
    });

    it('shows financial health widget in zero-events single-venue branch', async () => {
      setActiveVenueId(VENUE_A.id!);
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {}),
        },
      });

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      expect(await screen.findByTestId('financial-health-widget')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-no-events')).toBeInTheDocument();
    });

    it('hides financial health widget while dashboard loading', () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise(() => {})),
      );

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      expect(screen.queryByTestId('financial-health-widget')).not.toBeInTheDocument();
    });

    it('places banner before financial health widget before zones', async () => {
      setActiveVenueId(VENUE_A.id!);
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            upcomingEvents: [cardOn(offsetDate(1), { title: 'Upcoming Show' })],
            actionCenter: {
              totalUnmappedCount: 1,
              eventsWithUnmapped: [
                {
                  eventId: '22222222-2222-2222-2222-222222222222',
                  venueId: VENUE_A.id,
                  title: 'Upcoming Show',
                  eventDate: offsetDate(1),
                  unmappedCount: 1,
                },
              ],
            },
          }),
        },
      });

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      const banner = await screen.findByTestId('unassigned-transactions-banner');
      const widget = screen.getByTestId('financial-health-widget');
      const zones = screen.getByTestId('dashboard-overview');

      expect(banner.compareDocumentPosition(widget) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(widget.compareDocumentPosition(zones) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('bottleneck filter', () => {
    it('shows only recent events with bottleneck alerts when filter active', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            recentEvents: [
              cardOn(offsetDate(-2), {
                eventId: '33333333-3333-3333-3333-333333333333',
                title: 'Clean Recent',
              }),
              cardOn(offsetDate(-3), {
                eventId: '44444444-4444-4444-4444-444444444444',
                title: 'Alerted Recent',
                unmappedCount: 2,
              }),
            ],
          }),
        },
      });

      const user = userEvent.setup();
      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      const recentZone = await screen.findByTestId('dashboard-zone-recent');
      expect(within(recentZone).getByText('Clean Recent')).toBeInTheDocument();
      expect(within(recentZone).getByText('Alerted Recent')).toBeInTheDocument();

      await user.click(screen.getByTestId('bottleneck-filter-toggle'));

      expect(within(recentZone).queryByText('Clean Recent')).not.toBeInTheDocument();
      expect(within(recentZone).getByText('Alerted Recent')).toBeInTheDocument();
    });

    it('restores full recent list when filter deactivated', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            recentEvents: [
              cardOn(offsetDate(-2), {
                eventId: '33333333-3333-3333-3333-333333333333',
                title: 'Clean Recent',
              }),
              cardOn(offsetDate(-3), {
                eventId: '44444444-4444-4444-4444-444444444444',
                title: 'Alerted Recent',
                unmappedCount: 1,
              }),
            ],
          }),
        },
      });

      const user = userEvent.setup();
      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      await screen.findByTestId('dashboard-zone-recent');
      await user.click(screen.getByTestId('bottleneck-filter-toggle'));
      await user.click(screen.getByTestId('bottleneck-filter-toggle'));

      const recentZone = screen.getByTestId('dashboard-zone-recent');
      expect(within(recentZone).getByText('Clean Recent')).toBeInTheDocument();
      expect(within(recentZone).getByText('Alerted Recent')).toBeInTheDocument();
    });

    it('shows filtered empty message when no recent events need attention', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            recentEvents: [
              cardOn(offsetDate(-2), {
                eventId: '33333333-3333-3333-3333-333333333333',
                title: 'Clean Recent',
              }),
            ],
          }),
        },
      });

      const user = userEvent.setup();
      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      await screen.findByTestId('dashboard-zone-recent');
      await user.click(screen.getByTestId('bottleneck-filter-toggle'));

      expect(screen.getByText('No events need attention')).toBeInTheDocument();
    });

    it('resets filter when venue changes', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A, VENUE_B],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            recentEvents: [
              cardOn(offsetDate(-2), {
                eventId: '33333333-3333-3333-3333-333333333333',
                title: 'Venue A Alerted',
                unmappedCount: 1,
              }),
            ],
          }),
          [VENUE_B.id]: dashboardForVenue(VENUE_B.id, {
            recentEvents: [
              cardOn(offsetDate(-2), {
                eventId: EVENT_B.eventId,
                venueId: VENUE_B.id,
                title: 'Venue B Clean',
              }),
            ],
          }),
        },
      });

      const user = userEvent.setup();
      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      await screen.findByText('Venue A Alerted');
      await user.click(screen.getByTestId('bottleneck-filter-toggle'));
      expect(screen.getByTestId('bottleneck-filter-toggle')).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByTestId('venue-switcher-trigger'));
      await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

      await screen.findByText('Venue B Clean');
      expect(screen.getByTestId('bottleneck-filter-toggle')).toHaveAttribute('aria-pressed', 'false');
    });

    it('does not filter pinned or upcoming zones when recent filter active', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            pinnedEvents: [
              cardOn(offsetDate(1), {
                eventId: '11111111-1111-1111-1111-111111111111',
                title: 'Pinned Show',
              }),
            ],
            upcomingEvents: [
              cardOn(offsetDate(2), {
                eventId: '22222222-2222-2222-2222-222222222222',
                title: 'Upcoming Show',
              }),
            ],
            recentEvents: [
              cardOn(offsetDate(-2), {
                eventId: '33333333-3333-3333-3333-333333333333',
                title: 'Clean Recent',
              }),
              cardOn(offsetDate(-3), {
                eventId: '44444444-4444-4444-4444-444444444444',
                title: 'Alerted Recent',
                unmappedCount: 1,
              }),
            ],
          }),
        },
      });

      const user = userEvent.setup();
      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      await screen.findByTestId('dashboard-overview');
      await user.click(screen.getByTestId('bottleneck-filter-toggle'));

      expect(screen.getByText('Pinned Show')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Show')).toBeInTheDocument();
    });
  });

  describe('loading and error states', () => {
    it('hides bottleneck filter during dashboard error state', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardError: true,
      });

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      expect(await screen.findByText('Unable to load events. Please try again.')).toBeInTheDocument();
      expect(screen.queryByTestId('bottleneck-filter-toggle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('financial-health-widget')).not.toBeInTheDocument();
    });
  });

  describe('upcoming events calendar view', () => {
    it('toggles upcoming zone to mini-calendar without refetching dashboard', async () => {
      const user = userEvent.setup();
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            upcomingEvents: [
              cardOn(offsetDate(2), {
                eventId: '22222222-2222-2222-2222-222222222222',
                title: 'Upcoming Show',
              }),
            ],
          }),
        },
      });

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });

      await screen.findByTestId('dashboard-zone-upcoming');
      const fetchMock = vi.mocked(globalThis.fetch);
      const dashboardCallsBefore = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/dashboard'),
      ).length;

      await user.click(screen.getByTestId('upcoming-view-calendar'));
      expect(screen.getByTestId('upcoming-mini-calendar')).toBeInTheDocument();
      const dashboardCallsAfterToggle = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/dashboard'),
      ).length;
      expect(dashboardCallsAfterToggle).toBe(dashboardCallsBefore);

      await user.click(screen.getByTestId('upcoming-view-list'));
      expect(screen.getByTestId('event-card-22222222-2222-2222-2222-222222222222')).toBeInTheDocument();
    });

    it('preserves calendar view mode after remount within session', async () => {
      const user = userEvent.setup();
      mockWorkspaceFetch({
        venues: [VENUE_A],
        dashboardByVenue: {
          [VENUE_A.id]: dashboardForVenue(VENUE_A.id, {
            upcomingEvents: [
              cardOn(offsetDate(2), {
                eventId: '22222222-2222-2222-2222-222222222222',
                title: 'Upcoming Show',
              }),
            ],
          }),
        },
      });

      const { unmount } = render(<DashboardOverviewPage />, { wrapper: createWrapper() });
      await screen.findByTestId('dashboard-zone-upcoming');
      await user.click(screen.getByTestId('upcoming-view-calendar'));
      unmount();

      render(<DashboardOverviewPage />, { wrapper: createWrapper() });
      await screen.findByTestId('dashboard-zone-upcoming');
      expect(screen.getByTestId('upcoming-view-calendar')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('upcoming-mini-calendar')).toBeInTheDocument();
    });
  });
});
