import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountingOverviewPage } from '@/pages/AccountingOverviewPage';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { VenueProvider } from '@/venue/VenueContext';
import * as eventWorkspaceRoute from '@/lib/eventWorkspaceRoute';
import type { DashboardResponse, EventCardDto } from '@/types/generated-api';
import { VENUE_A } from '../fixtures/venues';
import { mockWorkspaceFetch, workspaceMemberProfile } from '../utils/mockWorkspaceFetch';
import { setActiveVenueId } from '@/venue/activeVenueStorage';

const mockLogout = vi.fn();

function card(overrides: Partial<EventCardDto> = {}): EventCardDto {
  return {
    eventId: overrides.eventId ?? 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    venueId: overrides.venueId ?? VENUE_A.id,
    title: overrides.title ?? 'Summer Show',
    eventDate: overrides.eventDate ?? '2026-06-20',
    status: overrides.status ?? 'SETTLED',
    isBudgetLocked: true,
    qboTagName: 'TAG',
    settlementPdfAvailable: false,
    isPinned: false,
    hasVarianceConcern: false,
    unmappedCount: overrides.unmappedCount ?? 3,
    lastSyncedAt: overrides.lastSyncedAt ?? null,
    ...overrides,
  };
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

describe('AccountingOverviewPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    setActiveVenueId(VENUE_A.id!);
  });

  it('renders no-venue empty state when no venues exist', async () => {
    mockWorkspaceFetch({ venues: [] });
    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('No venues yet')).toBeInTheDocument();
    expect(screen.getByTestId('accounting-overview-page')).toBeInTheDocument();
  });

  it('shows venue QBO status card when venue is selected', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id!]: {
          pinnedEvents: [],
          tonightEvents: [],
          upcomingEvents: [],
          recentEvents: [],
          actionCenter: { totalUnmappedCount: 0, events: [] },
        },
      },
      venueQboStatusByVenue: {
        [VENUE_A.id!]: {
          venueId: VENUE_A.id!,
          qboConnected: true,
          lastSyncedAt: '2026-06-18T12:00:00Z',
        },
      },
    });

    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venue-qbo-status-card')).toBeInTheDocument();
    expect(await screen.findByTestId('venue-qbo-status-connected')).toHaveTextContent('Connected');
  });

  it('renders unassigned transactions banner from dashboard action center', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id!]: {
          pinnedEvents: [],
          tonightEvents: [],
          upcomingEvents: [],
          recentEvents: [],
          actionCenter: {
            totalUnmappedCount: 4,
            events: [
              {
                eventId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                venueId: VENUE_A.id,
                title: 'Summer Show',
                unmappedCount: 4,
              },
            ],
          },
        } satisfies DashboardResponse,
      },
    });

    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('unassigned-transactions-banner')).toBeInTheDocument();
    expect(screen.getByText('4 unassigned transactions detected')).toBeInTheDocument();
  });

  it('links workload rows to event workspace with sync focus', async () => {
    const navigateSpy = vi.spyOn(eventWorkspaceRoute, 'navigateToEventWorkspace');
    mockWorkspaceFetch({
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id!]: {
          pinnedEvents: [],
          tonightEvents: [],
          upcomingEvents: [],
          recentEvents: [card()],
          actionCenter: { totalUnmappedCount: 3, events: [] },
        },
      },
      venueQboStatusByVenue: {
        [VENUE_A.id!]: {
          venueId: VENUE_A.id!,
          qboConnected: true,
          lastSyncedAt: '2026-06-18T12:00:00Z',
        },
      },
    });

    const user = userEvent.setup();
    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    const link = await screen.findByTestId('accounting-workload-link-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
    await user.click(link);
    expect(navigateSpy).toHaveBeenCalledWith(VENUE_A.id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'sync');
  });

  it('shows sync all for users with trigger permission when QuickBooks is connected', async () => {
    mockWorkspaceFetch({
      profile: {
        email: 'admin@example.com',
        organization: { id: 'org-1', name: 'Acme' },
        role: { permissions: { canViewFinancials: true, canTriggerQboSync: true } },
      },
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id!]: {
          pinnedEvents: [],
          tonightEvents: [],
          upcomingEvents: [],
          recentEvents: [],
          actionCenter: { totalUnmappedCount: 0, events: [] },
        },
      },
      venueQboStatusByVenue: {
        [VENUE_A.id!]: {
          venueId: VENUE_A.id!,
          qboConnected: true,
          lastSyncedAt: '2026-06-18T12:00:00Z',
        },
      },
    });

    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('sync-all-button')).toBeInTheDocument();
  });

  it('hides sync all and workload when QuickBooks is not connected', async () => {
    mockWorkspaceFetch({
      profile: {
        email: 'admin@example.com',
        organization: { id: 'org-1', name: 'Acme' },
        role: { permissions: { canViewFinancials: true, canTriggerQboSync: true } },
      },
      venues: [VENUE_A],
      dashboardByVenue: {
        [VENUE_A.id!]: {
          pinnedEvents: [],
          tonightEvents: [],
          upcomingEvents: [],
          recentEvents: [card()],
          actionCenter: { totalUnmappedCount: 3, events: [] },
        },
      },
      venueQboStatusByVenue: {
        [VENUE_A.id!]: {
          venueId: VENUE_A.id!,
          qboConnected: false,
          lastSyncedAt: null,
        },
      },
    });

    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venue-qbo-status-connected')).toHaveTextContent('Not connected');
    expect(screen.queryByTestId('sync-all-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('accounting-workload-list')).not.toBeInTheDocument();
  });

  it('denies unauthorized users who deep-link to accounting', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
    });

    render(<AccountingOverviewPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('accounting-access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('accounting-overview-page')).not.toBeInTheDocument();
  });
});
