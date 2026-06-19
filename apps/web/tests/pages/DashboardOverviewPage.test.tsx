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
import { clearAllPinnedEvents, isEventPinned } from '@/lib/pinnedEventStorage';
import type { EventResponse } from '@/types/generated-api';
import { EVENT_A, EVENT_B } from '../fixtures/events';
import { VENUE_A, VENUE_B } from '../fixtures/venues';
import {
  mockWorkspaceFetch,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

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

describe('DashboardOverviewPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAllPinnedEvents();
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

  it('shows empty state when no venues', async () => {
    mockWorkspaceFetch({ venues: [] });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-add-venue')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('shows no-events empty state without create CTA', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [] },
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
      eventsError: true,
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

  it('hides tonight hero when no events are dated today', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [eventOn(offsetDate(1), { title: 'Tomorrow Only' })],
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

  it('updates pinned zone when pin is toggled', async () => {
    const upcoming = eventOn(offsetDate(1), {
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Pin Me',
    });
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [upcoming] },
    });

    const user = userEvent.setup();
    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    const pinnedSection = await screen.findByTestId('dashboard-zone-pinned');
    expect(within(pinnedSection).getByText('No pinned events')).toBeInTheDocument();

    await user.click(screen.getByTestId('event-card-pin-dddddddd-dddd-dddd-dddd-dddddddddddd'));

    await waitFor(() => {
      expect(within(pinnedSection).getByText('Pin Me')).toBeInTheDocument();
    });
    expect(isEventPinned(VENUE_A.id, upcoming.eventId!)).toBe(true);
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
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardOverviewPage />, { wrapper: createWrapper() });

    await screen.findByTestId('dashboard-overview');
    expect(window.location.pathname).toBe('/');
    expect(window.location.pathname).not.toBe(
      buildEventWorkspacePath(VENUE_A.id, EVENT_A.eventId!),
    );
  });

  it('re-partitions zones when the active venue changes', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      eventsByVenue: {
        [VENUE_A.id]: [eventOn(offsetDate(1), { title: 'Venue A Show' })],
        [VENUE_B.id]: [eventOn(offsetDate(2), { eventId: EVENT_B.eventId, title: 'Venue B Show' })],
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

  it('aggregates events from all venues by default', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      eventsByVenue: {
        [VENUE_A.id]: [eventOn(offsetDate(1), { title: 'Venue A Show' })],
        [VENUE_B.id]: [eventOn(offsetDate(2), { eventId: EVENT_B.eventId, title: 'Venue B Show' })],
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
});
