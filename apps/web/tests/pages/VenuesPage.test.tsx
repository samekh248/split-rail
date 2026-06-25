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
import {
  mockWorkspaceFetch,
  workspaceAdminProfile,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

const VENUE_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
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
});
