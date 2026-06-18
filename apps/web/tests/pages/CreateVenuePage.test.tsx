import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateVenuePage } from '@/pages/CreateVenuePage';
import { AppShell } from '@/components/shell/AppShell';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import { getDashboardPath } from '@/lib/dashboardRoute';
import { getActiveVenueId } from '@/venue/activeVenueStorage';
import { VENUE_NAME_MAX_LENGTH } from '@/auth/validation';
import {
  mockWorkspaceFetch,
  workspaceAdminProfile,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

const CREATED_VENUE = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  name: 'The Roxy',
  organizationId: 'org-1',
  createdAt: '2026-06-17T00:00:00Z',
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

describe('CreateVenuePage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/venues/new');
    vi.unstubAllGlobals();
  });

  it('renders inside AppShell with organization name in top bar', async () => {
    mockWorkspaceFetch();
    render(<CreateVenuePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('app-shell')).toBeInTheDocument();
    expect(await screen.findByTestId('top-bar-org-name')).toHaveTextContent('Acme Org');
  });

  it('creates a venue and navigates to dashboard with active venue', async () => {
    mockWorkspaceFetch({ createdVenue: CREATED_VENUE });
    const user = userEvent.setup();

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), 'The Roxy');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    await waitFor(() => expect(getDashboardPath()).toBe('/'));
    await waitFor(() => expect(getActiveVenueId()).toBe(CREATED_VENUE.id));
  });

  it('silently redirects when user lacks permission', async () => {
    mockWorkspaceFetch({ profile: workspaceMemberProfile });

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(getDashboardPath()).toBe('/'));
    expect(screen.queryByLabelText('Venue name')).not.toBeInTheDocument();
  });

  it('shows inline validation for empty name without posting', async () => {
    mockWorkspaceFetch();
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: 'Create venue' }));

    expect(await screen.findByText('Venue name is required.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });

  it('shows inline validation for over-max-length name without posting', async () => {
    mockWorkspaceFetch();
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    const overMaxName = 'x'.repeat(VENUE_NAME_MAX_LENGTH + 1);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), overMaxName);
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    expect(
      await screen.findByText(`Venue name must be ${VENUE_NAME_MAX_LENGTH} characters or fewer.`),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });

  it('disables submit while request is pending', async () => {
    const user = userEvent.setup();

    let resolvePost: (value: unknown) => void = () => {};
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/users/me')) {
          return { ok: true, status: 200, json: () => Promise.resolve(workspaceAdminProfile) };
        }
        if (url.includes('/api/venues') && init?.method === 'POST') {
          return postPromise;
        }
        return { ok: true, status: 200, json: () => Promise.resolve([]) };
      }),
    );

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), 'Pending Venue');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    expect(screen.getByRole('button', { name: 'Creating venue…' })).toBeDisabled();

    resolvePost({
      ok: true,
      status: 201,
      json: () => Promise.resolve(CREATED_VENUE),
    });
  });

  it('shows error banner on server failure and retains entered name', async () => {
    mockWorkspaceFetch({ createVenueStatus: 500 });
    const user = userEvent.setup();

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), 'Retry Me');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByLabelText('Venue name')).toHaveValue('Retry Me');
  });

  it('cancel navigates to dashboard without creating', async () => {
    mockWorkspaceFetch();
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(getDashboardPath()).toBe('/');
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });
});
