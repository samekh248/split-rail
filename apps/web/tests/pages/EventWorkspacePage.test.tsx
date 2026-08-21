import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventWorkspacePage } from '@/pages/EventWorkspacePage';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { VenueProvider } from '@/venue/VenueContext';
import { getActiveVenueId, setActiveVenueId } from '@/venue/activeVenueStorage';
import { getActiveEventId, setActiveEventId } from '@/venue/activeEventStorage';
import { buildEventWorkspacePath } from '@/lib/appRoute';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import { EVENT_A, EVENT_B, EVENT_C, newlyCreatedEvent, noEvents } from '../fixtures/events';
import { VENUE_A, VENUE_B } from '../fixtures/venues';
import {
  mockWorkspaceFetch,
  workspaceAdminProfile,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({
    venueId,
    eventId,
    focus,
    extraHeaderActions,
    eventDetails,
    eventHeaderActions,
    hideEventHeader,
  }: {
    venueId: string;
    eventId: string;
    focus?: string | null;
    extraHeaderActions?: ReactNode;
    eventDetails?: ReactNode;
    eventHeaderActions?: ReactNode;
    hideEventHeader?: boolean;
  }) => (
    <div data-testid="event-ledger-page">
      <div
        data-testid="mock-ledger-page"
        data-focus={focus ?? ''}
        data-hide-event-header={hideEventHeader ? 'true' : 'false'}
      >
        {venueId}:{eventId}
      </div>
      {eventHeaderActions}
      {eventDetails}
      {extraHeaderActions}
    </div>
  ),
}));

const mockLogout = vi.fn();

function workspacePath(venueId: string, eventId: string) {
  return buildEventWorkspacePath(venueId, eventId);
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

describe('EventWorkspacePage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState(
      {},
      '',
      workspacePath(VENUE_A.id, EVENT_A.eventId!),
    );
    vi.unstubAllGlobals();
  });

  it('renders ledger from deep-linked workspace URL', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_A.id}:${EVENT_A.eventId}`,
    );
  });

  it('restores workspace context after reload at same URL', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A, EVENT_C] },
    });

    const { unmount } = render(<EventWorkspacePage />, { wrapper: createWrapper() });
    await screen.findByTestId('mock-ledger-page');

    unmount();
    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_A.id}:${EVENT_A.eventId}`,
    );
  });

  it('redirects to dashboard for inaccessible venue URL', async () => {
    window.history.pushState(
      {},
      '',
      workspacePath('00000000-0000-0000-0000-000000000099', EVENT_A.eventId!),
    );

    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('corrects unknown event id in URL to default event', async () => {
    window.history.pushState(
      {},
      '',
      workspacePath(VENUE_A.id, '00000000-0000-0000-0000-000000000099'),
    );

    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(window.location.pathname).toBe(workspacePath(VENUE_A.id, EVENT_A.eventId!)),
    );
    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(EVENT_A.eventId!);
  });

  it('switches selected event from combobox and updates URL', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A, EVENT_C] },
    });

    const user = userEvent.setup();
    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId(`event-option-${EVENT_C.eventId}`));

    await waitFor(() => {
      expect(window.location.pathname).toBe(workspacePath(VENUE_A.id, EVENT_C.eventId!));
      expect(window.location.search).toBe('');
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(EVENT_C.eventId!);
      expect(screen.getByTestId('mock-ledger-page')).toHaveAttribute('data-focus', '');
    });
  });

  it('resets event and URL when venue switches', async () => {
    setActiveVenueId(VENUE_A.id);
    setActiveEventId(VENUE_A.id, EVENT_A.eventId!);

    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      eventsByVenue: {
        [VENUE_A.id]: [EVENT_A],
        [VENUE_B.id]: [EVENT_B],
      },
    });

    const user = userEvent.setup();
    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(EVENT_A.eventId!),
    );

    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    await waitFor(() => {
      expect(window.location.pathname).toBe(workspacePath(VENUE_B.id, EVENT_B.eventId!));
      expect(window.location.search).toBe('');
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_B.id}:${EVENT_B.eventId}`,
      );
    });
  });

  it('keeps the deep-linked event when opening workspace from another venue context', async () => {
    setActiveVenueId(VENUE_A.id);
    setActiveEventId(VENUE_A.id, EVENT_A.eventId!);

    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      eventsByVenue: {
        [VENUE_A.id]: [EVENT_A],
        [VENUE_B.id]: [EVENT_B],
      },
      profile: workspaceAdminProfile,
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(EVENT_A.eventId!),
    );

    // Mirrors calendar / dashboard "Open workspace": storage + path update before React
    // venue state has switched.
    act(() => {
      navigateToEventWorkspace(VENUE_B.id, EVENT_B.eventId!);
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe(workspacePath(VENUE_B.id, EVENT_B.eventId!));
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_B.id}:${EVENT_B.eventId}`,
      );
    });
    expect(getActiveVenueId()).toBe(VENUE_B.id);
    expect(getActiveEventId(VENUE_B.id)).toBe(EVENT_B.eventId);
  });

  it('supports browser back after event switch', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A, EVENT_C] },
    });

    const user = userEvent.setup();
    render(<EventWorkspacePage />, { wrapper: createWrapper() });
    await screen.findByTestId('mock-ledger-page');

    await user.click(screen.getByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId(`event-option-${EVENT_C.eventId}`));
    await waitFor(() =>
      expect(window.location.pathname).toBe(workspacePath(VENUE_A.id, EVENT_C.eventId!)),
    );

    window.history.back();
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(EVENT_A.eventId!),
    );
  });

  it('shows events empty state with create CTA at workspace URL', async () => {
    window.history.pushState({}, '', workspacePath(VENUE_A.id, EVENT_A.eventId!));

    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-create-event')).toBeInTheDocument();
  });

  it('hides create affordances without financial permission', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-create-event')).not.toBeInTheDocument();
  });

  it('creates an event from empty state and navigates to new workspace URL', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
      createdEvent: newlyCreatedEvent,
    });

    const user = userEvent.setup();
    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-create-event'));
    await user.type(screen.getByLabelText('Event title'), newlyCreatedEvent.title!);
    await user.type(screen.getByLabelText('Event date'), newlyCreatedEvent.eventDate!);
    const panel = screen.getByTestId('event-form-panel');
    await user.click(within(panel).getByRole('button', { name: 'Create event' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        workspacePath(VENUE_A.id, newlyCreatedEvent.eventId!),
      );
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(newlyCreatedEvent.eventId!);
    });
  });

  it('creates a festival from the create panel and opens its workspace', async () => {
    const festivalEventId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef';
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
      createdFestivalEventId: festivalEventId,
    });

    const user = userEvent.setup();
    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-create-event'));
    await user.click(screen.getByTestId('event-type-festival'));
    await user.type(screen.getByLabelText('Festival name'), 'Kalispell Roundup');
    await user.type(screen.getByLabelText('Start date'), '2026-08-14');
    const endDate = screen.getByLabelText('End date');
    await user.clear(endDate);
    await user.type(endDate, '2026-08-16');

    const panel = screen.getByTestId('event-form-panel');
    await user.click(within(panel).getByRole('button', { name: 'Create festival' }));

    await waitFor(() =>
      expect(window.location.pathname).toBe(workspacePath(VENUE_A.id, festivalEventId)),
    );
  });

  it('shows events error with retry', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
      eventsError: true,
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load events');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('restores active venue after reload within session', async () => {
    setActiveVenueId(VENUE_B.id);
    window.history.pushState(
      {},
      '',
      workspacePath(VENUE_B.id, EVENT_B.eventId!),
    );

    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      eventsByVenue: {
        [VENUE_A.id]: [EVENT_A],
        [VENUE_B.id]: [EVENT_B],
      },
    });

    const { unmount } = render(<EventWorkspacePage />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(`${VENUE_B.id}:`),
    );
    unmount();

    render(<EventWorkspacePage />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(`${VENUE_B.id}:`),
    );
    expect(getActiveVenueId()).toBe(VENUE_B.id);
  });

  it('renders workspace controls in workspace bar above top bar', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const workspaceBar = await screen.findByTestId('workspace-bar');
    const scope = await waitFor(() => {
      const bar = within(workspaceBar).getByTestId('dashboard-workspace-bar');
      expect(bar).toHaveClass('dashboard-workspace-bar--nested');
      return bar;
    });
    expect(within(scope).getByTestId('workspace-bar-venue')).toBeInTheDocument();
    expect(within(scope).getByTestId('workspace-bar-separator')).toBeInTheDocument();
    expect(within(scope).getByTestId('workspace-bar-event')).toBeInTheDocument();
    expect(within(workspaceBar).getByTestId('venue-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-settings')).not.toBeInTheDocument();
  });

  it('passes recognized focus from URL to EventLedgerPage', async () => {
    window.history.pushState(
      {},
      '',
      buildEventWorkspacePath(VENUE_A.id, EVENT_A.eventId!, 'deal'),
    );

    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const ledger = await screen.findByTestId('mock-ledger-page');
    expect(ledger).toHaveAttribute('data-focus', 'deal');
  });

  it('passes empty focus for unrecognized query values', async () => {
    window.history.pushState(
      {},
      '',
      buildEventWorkspacePath(VENUE_A.id, EVENT_A.eventId!, 'invalid'),
    );

    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const ledger = await screen.findByTestId('mock-ledger-page');
    expect(ledger).toHaveAttribute('data-focus', '');
  });

  it('re-applies focus when query changes on the same event', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveAttribute('data-focus', '');

    act(() => {
      window.history.pushState(
        {},
        '',
        buildEventWorkspacePath(VENUE_A.id, EVENT_A.eventId!, 'settlement'),
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-ledger-page')).toHaveAttribute('data-focus', 'settlement');
    });
  });

  it('wraps the ledger in the event-workspace inset', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const workspace = await screen.findByTestId('event-workspace');
    expect(workspace).toContainElement(screen.getByTestId('event-ledger-page'));
  });

  it('shows show details with a visible Edit action on a standard event workspace', async () => {
    mockWorkspaceFetch({
      profile: workspaceAdminProfile,
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [{ ...EVENT_A, bookingPlacementStatus: 'CONFIRMED', doorsTime: '19:00' }],
      },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('event-details-card')).toBeInTheDocument();
    expect(screen.getByText('Doors: 7:00 PM')).toBeInTheDocument();
    expect(screen.getByTestId('event-details-edit')).toBeInTheDocument();
  });

  it('opens the workspace edit form from the show-details Edit action', async () => {
    const user = userEvent.setup();
    mockWorkspaceFetch({
      profile: workspaceAdminProfile,
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [{ ...EVENT_A, bookingPlacementStatus: 'CONFIRMED', doorsTime: '19:00' }],
      },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('event-details-edit'));

    const panel = await screen.findByTestId('event-form-panel');
    expect(within(panel).getByLabelText('Doors time')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Show start time')).toBeInTheDocument();
    expect(screen.queryByTestId('event-ledger-page')).not.toBeInTheDocument();
  });

  it('omits the show-details Edit action without event-manage permission', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('event-details-card')).toBeInTheDocument();
    expect(screen.queryByTestId('event-details-edit')).not.toBeInTheDocument();
  });

  it('offers Convert to festival in the ledger header for a user who can manage the festival schedule', async () => {
    mockWorkspaceFetch({
      profile: workspaceAdminProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('festival-convert-menu-trigger')).toBeInTheDocument();
  });

  it('omits Convert to festival for a user who cannot manage the festival schedule', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await screen.findByTestId('event-ledger-page');
    expect(screen.queryByTestId('festival-convert-menu-trigger')).not.toBeInTheDocument();
  });

  it('omits Convert to festival once the event is settled', async () => {
    mockWorkspaceFetch({
      profile: workspaceAdminProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [{ ...EVENT_A, status: 'SETTLED' }] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    await screen.findByTestId('event-ledger-page');
    expect(screen.queryByTestId('festival-convert-menu-trigger')).not.toBeInTheDocument();
  });

  it('passes hideEventHeader=false for standard events so ledger shows meta', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const ledger = await screen.findByTestId('mock-ledger-page');
    expect(ledger).toHaveAttribute('data-hide-event-header', 'false');
  });

  it('renders pin control inside the event combobox for standard events', async () => {
    const user = userEvent.setup();
    const mock = mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const combobox = await screen.findByTestId('event-combobox');
    const pinButton = await within(combobox).findByTestId(
      `event-combobox-pin-${EVENT_A.eventId}`,
    );
    expect(pinButton).toHaveClass('event-combobox__pin');
    expect(pinButton).toHaveAttribute('aria-label', 'Pin event');

    await user.click(pinButton);

    await waitFor(() => {
      expect(mock.pinRequests.some((request) => request.method === 'PUT')).toBe(true);
    });
  });

  it('renders pin control inside the event combobox for festival events', async () => {
    const festivalEvent = { ...EVENT_A, eventType: 'FESTIVAL' as const, title: 'Big Fest' };
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [festivalEvent] },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const combobox = await screen.findByTestId('event-combobox');
    const pinButton = await within(combobox).findByTestId(
      `event-combobox-pin-${festivalEvent.eventId}`,
    );
    expect(pinButton).toHaveClass('event-combobox__pin');
    expect(pinButton).toHaveAttribute('aria-label', 'Pin festival');
  });

  it('passes hideEventHeader=true for festival events', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: {
        [VENUE_A.id]: [{ ...EVENT_A, eventType: 'FESTIVAL' }],
      },
    });

    render(<EventWorkspacePage />, { wrapper: createWrapper() });

    const ledger = await screen.findByTestId('mock-ledger-page');
    expect(ledger).toHaveAttribute('data-hide-event-header', 'true');
  });
});
