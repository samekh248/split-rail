import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateVenuePage } from '@/pages/CreateVenuePage';
import { VenueProvider } from '@/venue/VenueContext';
import { getDashboardPath } from '@/lib/dashboardRoute';
import { getActiveVenueId } from '@/venue/activeVenueStorage';

const CREATED_VENUE = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  name: 'The Roxy',
  organizationId: 'org-1',
  createdAt: '2026-06-17T00:00:00Z',
};

const ADMIN_PROFILE = {
  role: { permissions: { canManagePermissions: true } },
};

const MEMBER_PROFILE = {
  role: { permissions: { canManagePermissions: false } },
};

function mockApiFetch({
  profile = ADMIN_PROFILE,
  venues = [] as unknown[],
  createStatus = 201,
}: {
  profile?: typeof ADMIN_PROFILE | typeof MEMBER_PROFILE;
  venues?: unknown[];
  createStatus?: number;
} = {}) {
  let venueList = [...venues];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/users/me')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(profile),
        };
      }
      if (url.includes('/api/venues') && init?.method === 'POST') {
        if (createStatus >= 400) {
          return {
            ok: false,
            status: createStatus,
            statusText: 'Error',
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        venueList = [CREATED_VENUE];
        return {
          ok: true,
          status: 201,
          json: () => Promise.resolve(CREATED_VENUE),
        };
      }
      if (url.includes('/api/venues')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(venueList),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      };
    }),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <VenueProvider>{children}</VenueProvider>
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

  it('creates a venue and navigates to dashboard with active venue', async () => {
    mockApiFetch();
    const user = userEvent.setup();

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), 'The Roxy');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    await waitFor(() => expect(getDashboardPath()).toBe('/'));
    await waitFor(() => expect(getActiveVenueId()).toBe(CREATED_VENUE.id));
  });

  it('silently redirects when user lacks permission', async () => {
    mockApiFetch({ profile: MEMBER_PROFILE });

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await waitFor(() => expect(getDashboardPath()).toBe('/'));
    expect(screen.queryByLabelText('Venue name')).not.toBeInTheDocument();
  });

  it('shows inline validation for empty name without posting', async () => {
    mockApiFetch();
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: 'Create venue' }));

    expect(await screen.findByText('Venue name is required.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });

  it('disables submit while request is pending', async () => {
    mockApiFetch();
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
          return { ok: true, status: 200, json: () => Promise.resolve(ADMIN_PROFILE) };
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
    mockApiFetch({ createStatus: 500 });
    const user = userEvent.setup();

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.type(await screen.findByLabelText('Venue name'), 'Retry Me');
    await user.click(screen.getByRole('button', { name: 'Create venue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByLabelText('Venue name')).toHaveValue('Retry Me');
  });

  it('cancel navigates to dashboard without creating', async () => {
    mockApiFetch();
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);

    render(<CreateVenuePage />, { wrapper: createWrapper() });

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(getDashboardPath()).toBe('/');
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(0);
  });
});
