import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VenuesPage } from '@/pages/VenuesPage';
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

  it('renders venue list for admin', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venues-page')).toBeInTheDocument();
    expect(await screen.findByTestId('venue-list-table')).toBeInTheDocument();
    expect(screen.getByTestId('venues-add-venue')).toBeInTheDocument();
  });

  it('shows empty state with add CTA for admin', async () => {
    mockWorkspaceFetch({ venues: [] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('venues-empty-add-venue')).toBeInTheDocument();
    await user.click(screen.getByTestId('venues-empty-add-venue'));
    expect(getAppPath()).toBe('/venues/new');
  });

  it('shows read-only empty state for member', async () => {
    mockWorkspaceFetch({ profile: workspaceMemberProfile, venues: [] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('No venues yet')).toBeInTheDocument();
    expect(screen.queryByTestId('venues-empty-add-venue')).not.toBeInTheDocument();
    expect(screen.queryByTestId('venues-add-venue')).not.toBeInTheDocument();
  });

  it('hides edit and delete for read-only users', async () => {
    mockWorkspaceFetch({ profile: workspaceMemberProfile, venues: [VENUE_A] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    await screen.findByText('Hall A');
    expect(screen.queryByTestId(`edit-venue-${VENUE_A.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`delete-venue-${VENUE_A.id}`)).not.toBeInTheDocument();
  });

  it('opens edit modal from list', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`edit-venue-${VENUE_A.id}`));
    expect(screen.getByTestId('venue-edit-modal')).toBeInTheDocument();
  });

  it('deletes a venue from confirm dialog', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`delete-venue-${VENUE_A.id}`));
    await user.click(screen.getByTestId('delete-venue-confirm-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('delete-venue-confirm')).not.toBeInTheDocument();
    });
  });

  it('navigates to create page from header CTA', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A], profile: workspaceAdminProfile });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId('venues-add-venue'));
    expect(getAppPath()).toBe('/venues/new');
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
    await user.selectOptions(screen.getByTestId('venues-region-filter'), 'region-a');
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

  it('shows filter-empty state when no venues match', async () => {
    document.cookie = 'venuesPageRegionFilter=region-b; Path=/; SameSite=Lax';
    mockWorkspaceFetch({ venues: [VENUE_A], regions: [REGION_WEST, REGION_EAST] });

    render(<VenuesPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('No venues in this region')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-list-table')).not.toBeInTheDocument();
  });

  it('switches to grouped view', async () => {
    mockWorkspaceFetch({
      venues: [VENUE_A],
      regions: [REGION_WEST, REGION_EAST],
    });
    const user = userEvent.setup();

    render(<VenuesPage />, { wrapper: createWrapper() });

    await user.selectOptions(await screen.findByTestId('venues-display-mode'), 'grouped');
    expect(screen.getByTestId('venues-grouped-list')).toBeInTheDocument();
    expect(screen.getByTestId('venues-region-empty-region-b')).toHaveTextContent('No venues');
    expect(screen.queryByTestId('venue-list-table')).not.toBeInTheDocument();
  });

  it('restores filter and display mode from cookies on remount', async () => {
    document.cookie = 'venuesPageRegionFilter=region-a; Path=/; SameSite=Lax';
    document.cookie = 'venuesPageDisplayMode=grouped; Path=/; SameSite=Lax';
    mockWorkspaceFetch({
      venues: [VENUE_A, VENUE_B],
      regions: [REGION_WEST, REGION_EAST],
    });

    const { unmount } = render(<VenuesPage />, { wrapper: createWrapper() });
    await screen.findByTestId('venues-grouped-list');
    unmount();

    render(<VenuesPage />, { wrapper: createWrapper() });
    expect(await screen.findByTestId('venues-grouped-list')).toBeInTheDocument();
    expect(screen.getByTestId('venues-region-filter')).toHaveValue('region-a');
  });
});
