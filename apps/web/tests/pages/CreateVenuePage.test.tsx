import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateVenuePage } from '@/pages/CreateVenuePage';
import { AppShell } from '@/components/shell/AppShell';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import { getAppPath } from '@/lib/appRoute';
import { getActiveVenueId } from '@/venue/activeVenueStorage';
import { VENUE_NAME_MAX_LENGTH } from '@/auth/validation';
import {
  mockWorkspaceFetch,
  workspaceAdminProfile,
  workspaceMemberProfile,
} from '../utils/mockWorkspaceFetch';

const REGION_WEST = { id: 'region-a', name: 'West', notes: null, venueCount: 0 };
const REGION_EAST = { id: 'region-b', name: 'East', notes: null, venueCount: 0 };

const CREATED_VENUE = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  name: 'The Roxy',
  organizationId: 'org-1',
  createdAt: '2026-06-17T00:00:00Z',
  regionId: REGION_WEST.id,
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
    window.history.pushState({}, '', `/venues/new?regionId=${REGION_WEST.id}`);
    vi.unstubAllGlobals();
  });

  it('renders inside AppShell on desktop without empty header chrome', async () => {
    mockWorkspaceFetch({ regions: [REGION_WEST] });
    render(<CreateVenuePage />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('app-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('app-shell-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-bar-org-name')).not.toBeInTheDocument();
  });

  it('shows the target region name and creates a venue tied to it', async () => {
    mockWorkspaceFetch({ regions: [REGION_WEST, REGION_EAST], createdVenue: CREATED_VENUE });
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    expect(await screen.findByText(/West/)).toBeInTheDocument();
    expect(screen.queryByTestId('venue-region-field')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Venue name'), 'The Roxy');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    await waitFor(() => expect(getAppPath()).toBe('/venues'));
    await waitFor(() => expect(getActiveVenueId()).toBe(CREATED_VENUE.id));

    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(postCall).toBeDefined();
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      name: 'The Roxy',
      regionId: REGION_WEST.id,
    });
  });

  it('silently redirects when user lacks permission', async () => {
    mockWorkspaceFetch({ regions: [REGION_WEST], profile: workspaceMemberProfile });

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(getAppPath()).toBe('/venues'));
    expect(screen.queryByLabelText('Venue name')).not.toBeInTheDocument();
  });

  it('redirects to venues when no regionId is present in the URL', async () => {
    window.history.pushState({}, '', '/venues/new');
    mockWorkspaceFetch({ regions: [REGION_WEST] });

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(getAppPath()).toBe('/venues'));
    expect(screen.queryByLabelText('Venue name')).not.toBeInTheDocument();
  });

  it('redirects to venues when the regionId does not match any known region', async () => {
    window.history.pushState({}, '', '/venues/new?regionId=does-not-exist');
    mockWorkspaceFetch({ regions: [REGION_WEST] });

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(getAppPath()).toBe('/venues'));
    expect(screen.queryByLabelText('Venue name')).not.toBeInTheDocument();
  });

  it('redirects to venues when the organization has zero regions', async () => {
    mockWorkspaceFetch({ regions: [] });

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(getAppPath()).toBe('/venues'));
    expect(screen.queryByLabelText('Venue name')).not.toBeInTheDocument();
  });

  it('shows inline validation for empty name without posting', async () => {
    mockWorkspaceFetch({ regions: [REGION_WEST] });
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: 'Create venue' }));

    expect(await screen.findByText('Venue name is required.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });

  it('shows inline validation for over-max-length name without posting', async () => {
    mockWorkspaceFetch({ regions: [REGION_WEST] });
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
        if (url.includes('/api/regions')) {
          return { ok: true, status: 200, json: () => Promise.resolve([REGION_WEST]) };
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
    mockWorkspaceFetch({ regions: [REGION_WEST], createVenueStatus: 500 });
    const user = userEvent.setup();

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), 'Retry Me');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByLabelText('Venue name')).toHaveValue('Retry Me');
  });

  it('cancel navigates to dashboard without creating', async () => {
    mockWorkspaceFetch({ regions: [REGION_WEST] });
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(getAppPath()).toBe('/venues');
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });
});
