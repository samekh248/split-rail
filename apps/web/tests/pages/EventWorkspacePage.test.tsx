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
  }: {
    venueId: string;
    eventId: string;
    focus?: string | null;
  }) => (
    <div data-testid="mock-ledger-page" data-focus={focus ?? ''}>
      {venueId}:{eventId}
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
    expect(within(workspaceBar).getByTestId('dashboard-workspace-bar')).toBeInTheDocument();
    expect(await within(workspaceBar).findByTestId('venue-switcher')).toBeInTheDocument();
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
});
