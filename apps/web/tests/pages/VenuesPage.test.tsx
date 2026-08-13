import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VenuesPage } from '@/pages/VenuesPage';
import { regionsQueryKey } from '@/api/regions';
import { AppShell } from '@/components/shell/AppShell';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import { getAppPath } from '@/lib/appRoute';
import { clearVenuesPageViewCookies } from '@/lib/venueListViewStorage';
import {
  mockWorkspaceFetch,
  workspaceAdminProfile,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';
import { pickSelectFieldOption } from '../utils/selectField';

const REGION_WEST = { id: 'region-a', name: 'West', notes: null, venueCount: 1 };
const REGION_EAST = { id: 'region-b', name: 'East', notes: null, venueCount: 0 };

const VENUE_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
  regionId: 'region-a',
};

const VENUE_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-06-02T00:00:00Z',
  regionId: 'region-b',
};

const VENUE_UNASSIGNED = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  name: 'Loft',
  organizationId: 'org-1',
  createdAt: '2026-06-03T00:00:00Z',
  regionId: null,
};

function createWrapper(
  queryClient: QueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
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
    logout: vi.fn(),
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

describe('VenuesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearVenuesPageViewCookies();
    window.history.pushState({}, '', '/venues');
    vi.unstubAllGlobals();
  });

  it('renders venue list for admin with zero regions and no add-venue action anywhere', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venues-page')).toBeInTheDocument();
    expect(await screen.findByTestId('venue-list-table')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add venue' })).not.toBeInTheDocument();
  });

  it('blocks venue creation and points to region setup when there are zero regions and zero venues', async () => {
    mockWorkspaceFetch({ venues: [] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('No venues yet');
    expect(screen.getByText('Create a region to start adding venues.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add venue' })).not.toBeInTheDocument();
    expect(screen.getByTestId('venues-manage-regions')).toHaveTextContent('Create your first region');
  });

  it('shows read-only empty state for member', async () => {
    mockWorkspaceFetch({ profile: workspaceMemberProfile, venues: [] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('No venues yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add venue' })).not.toBeInTheDocument();
  });

  it('hides edit for read-only users', async () => {
    mockWorkspaceFetch({ profile: workspaceMemberProfile, venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    expect(screen.queryByTestId(`edit-venue-${VENUE_A.id}`)).not.toBeInTheDocument();
  });

  it('opens edit modal from list', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`edit-venue-${VENUE_A.id}`));
    expect(screen.getByTestId('venue-edit-modal')).toBeInTheDocument();
  });

  it('deletes a venue via the delete button inside the edit modal', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`edit-venue-${VENUE_A.id}`));
    expect(screen.getByTestId('venue-edit-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('venue-edit-delete'));
    expect(await screen.findByTestId('delete-venue-confirm')).toBeInTheDocument();

    await user.click(screen.getByTestId('delete-venue-confirm-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('delete-venue-confirm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('venue-edit-modal')).not.toBeInTheDocument();
    });
  });

  it('canceling delete from the edit modal returns to the edit form', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`edit-venue-${VENUE_A.id}`));
    await user.click(screen.getByTestId('venue-edit-delete'));
    const confirmDialog = await screen.findByTestId('delete-venue-confirm');

    await user.click(within(confirmDialog).getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByTestId('delete-venue-confirm')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('venue-edit-modal')).toBeInTheDocument();
  });

  it("opens the Add venue modal from a region's Add venue button without navigating away", async () => {
    mockWorkspaceFetch({ venues: [VENUE_A], regions: [REGION_WEST, REGION_EAST] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`venues-add-venue-${REGION_WEST.id}`));

    const modal = await screen.findByTestId('venue-add-modal');
    expect(within(modal).getByText(new RegExp(REGION_WEST.name))).toBeInTheDocument();
    expect(getAppPath()).toBe('/venues');
  });

  it('creates a venue via the Add venue modal tied to the correct region', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      regions: [REGION_WEST, REGION_EAST],
      createdVenue: {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'The Roxy',
        organizationId: 'org-1',
        createdAt: '2026-06-04T00:00:00Z',
        regionId: REGION_WEST.id,
      },
    });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`venues-add-venue-${REGION_WEST.id}`));
    await user.type(screen.getByLabelText('Venue name'), 'The Roxy');
    await user.click(screen.getByTestId('venue-add-save'));

    await waitFor(() => {
      expect(screen.queryByTestId('venue-add-modal')).not.toBeInTheDocument();
    });
    expect(getAppPath()).toBe('/venues');
  });

  it('does not render an Add venue button on the Unassigned section', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_UNASSIGNED],
      regions: [REGION_WEST, REGION_EAST],
    });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByTestId('venues-region-section-unassigned');
    expect(screen.queryByTestId('venues-add-venue-unassigned')).not.toBeInTheDocument();
  });

  it('shows error state with retry', async () => {
    mockWorkspaceFetch({ venuesOk: false, venuesStatus: 500 });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Unable to load venues. Please try again.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('shows manage regions for admin and opens region panel', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A], regions: [REGION_WEST, REGION_EAST] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venues-manage-regions')).toBeInTheDocument();
    await user.click(screen.getByTestId('venues-manage-regions'));
    expect(screen.getByTestId('booking-region-panel')).toBeInTheDocument();
  });

  it('drag-and-drop reassigns a venue to a different region end-to-end (US1)', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      regions: [REGION_WEST, REGION_EAST],
    });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByTestId(`venue-drag-handle-${VENUE_A.id}`);
    fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE_A.id}`));
    fireEvent.drop(screen.getByTestId(`venues-region-table-${REGION_EAST.id}`));

    await waitFor(() => {
      const eastSection = screen.getByTestId(`venues-region-section-${REGION_EAST.id}`);
      expect(eastSection).toHaveTextContent('Hall A');
      expect(eastSection).toHaveTextContent('Hall B');
    });
    expect(
      screen.getByTestId(`venues-region-section-${REGION_WEST.id}`),
    ).not.toHaveTextContent('Hall A');
  });

  it('hides manage regions for read-only users', async () => {
    mockWorkspaceFetch({
      profile: workspaceMemberProfile,
      venues: [VENUE_A],
      regions: [REGION_WEST],
    });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    expect(screen.queryByTestId('venues-manage-regions')).not.toBeInTheDocument();
  });

  it('filters venues by region', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B, VENUE_UNASSIGNED],
      regions: [REGION_WEST, REGION_EAST],
    });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByTestId('venues-region-filter');
    await pickSelectFieldOption(user, 'venues-region-filter', 'region-a');
    expect(screen.getByText('Hall A')).toBeInTheDocument();
    expect(screen.queryByText('Hall B')).not.toBeInTheDocument();
    expect(screen.queryByText('Loft')).not.toBeInTheDocument();
  });

  it('omits unassigned filter when all venues are assigned', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      regions: [REGION_WEST, REGION_EAST],
    });

    render(<VenuesPage />, { wrapper: createWrapper() });

    const filter = await screen.findByTestId('venues-region-filter');
    expect(screen.queryByRole('option', { name: 'Unassigned' })).not.toBeInTheDocument();
    expect(filter).toBeInTheDocument();
  });

  it('shows an inline empty message with an Add venue action when a region filter matches no venues', async () => {
    document.cookie = 'venuesPageRegionFilter=region-b; Path=/; SameSite=Lax';
    mockWorkspaceFetch({ venues: [VENUE_A], regions: [REGION_WEST, REGION_EAST] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venues-region-empty-region-b')).toHaveTextContent('No venues');
    expect(screen.getByTestId(`venues-add-venue-${REGION_EAST.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId('venue-list-table')).not.toBeInTheDocument();
  });

  it('renders the grouped view by default whenever the organization has regions', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      regions: [REGION_WEST, REGION_EAST],
    });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venues-grouped-list')).toBeInTheDocument();
    expect(screen.getByTestId('venues-region-empty-region-b')).toHaveTextContent('No venues');
    expect(screen.queryByTestId('venue-list-table')).not.toBeInTheDocument();
  });

  it('restores the region filter from cookies on remount', async () => {
    document.cookie = 'venuesPageRegionFilter=region-a; Path=/; SameSite=Lax';
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      regions: [REGION_WEST, REGION_EAST],
    });

    const { unmount } = render(<VenuesPage />, { wrapper: createWrapper() });
    await screen.findByTestId('venues-grouped-list');
    unmount();

    render(<VenuesPage />, { wrapper: createWrapper() });
    expect(await screen.findByTestId('venues-grouped-list')).toBeInTheDocument();
    expect(screen.getByTestId('venues-region-filter')).toHaveTextContent('West');
  });

  it('hides region filter and any "Unassigned" heading when the organization has zero regions', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    expect(screen.queryByTestId('venues-region-filter')).not.toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
    expect(screen.getByTestId('venue-list-table')).toBeInTheDocument();
  });

  it('shows exactly one create-regions prompt for admins when there are zero regions', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    expect(screen.getAllByTestId('venues-manage-regions')).toHaveLength(1);
    expect(screen.queryByTestId('venues-no-regions-helper')).not.toBeInTheDocument();
  });

  it('shows only the create-regions prompt in the header, with no Add venue action, when there are zero regions', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    const header = screen.getByTestId('venues-page').querySelector('header');
    expect(header).not.toBeNull();
    expect(header).toContainElement(screen.getByTestId('venues-manage-regions'));
    expect(screen.queryByRole('button', { name: 'Add venue' })).not.toBeInTheDocument();
  });

  it('shows no region-related controls for members when there are zero regions', async () => {
    mockWorkspaceFetch({ profile: workspaceMemberProfile, venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    expect(screen.queryAllByTestId('venues-manage-regions')).toHaveLength(0);
    expect(screen.queryByTestId('venues-region-filter')).not.toBeInTheDocument();
  });

  it('falls back to the unified list when regions drop to zero while mounted', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockWorkspaceFetch({ venues: [VENUE_A], regions: [REGION_WEST, REGION_EAST] });

    render(<VenuesPage />, { wrapper: createWrapper(queryClient) });

    await screen.findByTestId('venues-region-filter');
    expect(screen.getByTestId('venues-grouped-list')).toBeInTheDocument();

    queryClient.setQueryData(regionsQueryKey(), []);

    await waitFor(() => {
      expect(screen.queryByTestId('venues-region-filter')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('venue-list-table')).toBeInTheDocument();
  });
});
