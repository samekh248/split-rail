import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { VenueProvider } from '@/venue/VenueContext';
import { buildEventWorkspacePath } from '@/lib/appRoute';
import { getDashboardPath } from '@/lib/dashboardRoute';
import { EVENT_A, newlyCreatedEvent, noEvents } from '../fixtures/events';
import { VENUE_A } from '../fixtures/venues';
import {
  mockWorkspaceFetch,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

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
        <VenueProvider>
          <AppShell>{children}</AppShell>
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
    vi.unstubAllGlobals();
  });

  it('shows empty state when no venues', async () => {
    mockWorkspaceFetch({ venues: [] });

    render(<DashboardHome />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-add-venue')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('redirects to workspace URL when events exist', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: [EVENT_A] },
    });

    render(<DashboardHome />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(window.location.pathname).toBe(
        buildEventWorkspacePath(VENUE_A.id, EVENT_A.eventId!),
      ),
    );
  });

  it('shows events empty state with create CTA at root', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
    });

    render(<DashboardHome />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-create-event')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('hides create affordances without financial permission at root', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
    });

    render(<DashboardHome />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No events yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-create-event')).not.toBeInTheDocument();
  });

  it('hides empty-state add venue for restricted user with zero venues', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [],
    });

    render(<DashboardHome />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-add-venue')).not.toBeInTheDocument();
  });

  it('navigates to create page from empty-state venue CTA', async () => {
    mockWorkspaceFetch({ venues: [] });
    const user = userEvent.setup();

    render(<DashboardHome />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-add-venue'));
    expect(getDashboardPath()).toBe('/venues/new');
  });

  it('creates an event from root empty state and redirects to workspace URL', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      eventsByVenue: { [VENUE_A.id]: noEvents },
      createdEvent: newlyCreatedEvent,
    });

    const user = userEvent.setup();
    render(<DashboardHome />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('empty-state-create-event'));
    await user.type(screen.getByLabelText('Event title'), newlyCreatedEvent.title!);
    await user.type(screen.getByLabelText('Event date'), newlyCreatedEvent.eventDate!);
    const panel = screen.getByTestId('event-form-panel');
    await user.click(within(panel).getByRole('button', { name: 'Create event' }));

    await waitFor(() =>
      expect(window.location.pathname).toBe(
        buildEventWorkspacePath(VENUE_A.id, newlyCreatedEvent.eventId!),
      ),
    );
  });
});
