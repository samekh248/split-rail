import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import { getActiveVenueId, setActiveVenueId } from '@/venue/activeVenueStorage';
import { getActiveEventId, setActiveEventId } from '@/venue/activeEventStorage';
import { getDashboardPath } from '@/lib/dashboardRoute';
import { EVENT_A, EVENT_B, EVENT_C, newlyCreatedEvent, noEvents } from '../fixtures/events';
import { VENUE_A, VENUE_B } from '../fixtures/venues';
import {
  mockWorkspaceFetch,
  workspaceAdminProfile,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

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
    completeAcceptInvitation: vi.fn(),
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
    mockWorkspaceFetch({ venues: [] });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-add-venue')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
  });

  it('shows persistent shell add venue when venues exist for permitted user', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('header-add-venue')).toBeInTheDocument();
  });

  it('hides empty-state add venue for restricted user with zero venues', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [],
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-add-venue')).not.toBeInTheDocument();
  });

  it('hides shell add venue for restricted user with existing venues', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await screen.findByTestId('mock-ledger-page');
    expect(screen.queryByTestId('header-add-venue')).not.toBeInTheDocument();
  });

  it('renders ledger with resolved event id', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent(
      `${VENUE_A.id}:${EVENT_A.eventId}`,
    );
  });

  it('switches selected event from combobox', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A, EVENT_C] },
    });

    const user = userEvent.setup();
    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId(`event-option-${EVENT_C.eventId}`));

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_A.id}:${EVENT_C.eventId}`,
      ),
    );
  });

  it('resets event when venue switches', async () => {
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
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-create-event')).toBeInTheDocument();
  });

  it('hides create affordances without financial permission', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-create-event')).not.toBeInTheDocument();
  });

  it('creates an event from empty state and shows the ledger', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
      createdEvent: newlyCreatedEvent,
    });

    const user = userEvent.setup();
    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-create-event'));
    await user.type(screen.getByLabelText('Event title'), newlyCreatedEvent.title!);
    await user.type(screen.getByLabelText('Event date'), newlyCreatedEvent.eventDate!);
    const panel = screen.getByTestId('event-form-panel');
    await user.click(within(panel).getByRole('button', { name: 'Create event' }));

    await waitFor(() =>
      expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
        `${VENUE_A.id}:${newlyCreatedEvent.eventId}`,
      ),
    );
  });

  it('shows events error with retry', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
      eventsError: true,
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load events');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('navigates to create page from empty-state venue CTA', async () => {
    mockWorkspaceFetch({ venues: [] });
    const user = userEvent.setup();

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-add-venue'));
    expect(getDashboardPath()).toBe('/venues/new');
  });

  it('restores active venue after reload within session', async () => {
    setActiveVenueId(VENUE_B.id);
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
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

  it('shows Settings link for all authenticated users', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardHome organizationName="Acme" />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('header-settings')).toBeInTheDocument();
  });
});
