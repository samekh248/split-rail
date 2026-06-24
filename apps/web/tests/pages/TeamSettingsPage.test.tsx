import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamSettingsPage } from '@/pages/TeamSettingsPage';
import { getAppPath } from '@/lib/appRoute';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: vi.fn(),
}));

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import { useUserProfile } from '@/api/user';

function mockTeamFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/roles')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: 'role-1', roleName: 'Promoter' }]),
        };
      }
      if (url.includes('/api/venues')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: 'ven-1', name: 'Hall A' }]),
        };
      }
      if (url.includes('/api/invitations') && !url.includes('/accept')) {
        if (url.endsWith('/api/invitations')) {
          return {
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve([
                {
                  id: 'inv-1',
                  email: 'pending@example.com',
                  roleName: 'Promoter',
                  status: 'pending',
                  expiresAt: '2026-12-01T00:00:00Z',
                  venueScopes: [{ venueId: 'ven-1', venueName: 'Hall A' }],
                },
              ]),
          };
        }
        return {
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'inv-2',
              email: 'new@example.com',
              roleName: 'Promoter',
              status: 'pending',
              venueScopes: [],
            }),
        };
      }
      if (url.includes('/api/users')) {
        return {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                id: 'user-1',
                email: 'admin@example.com',
                role: { roleName: 'Admin' },
                venueScopes: [],
              },
            ]),
        };
      }
      return { ok: true, status: 200, json: () => Promise.resolve([]) };
    }),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('TeamSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/settings/team');
    vi.mocked(useUserProfile).mockReturnValue({
      isLoading: false,
      isFetched: true,
      data: { role: { permissions: { canManagePermissions: true } } },
    } as ReturnType<typeof useUserProfile>);
  });

  it('redirects non-admins to settings without an error message', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(false);
    render(<TeamSettingsPage />, { wrapper: createWrapper() });
    await waitFor(() => expect(getAppPath()).toBe('/settings'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Invite member' })).not.toBeInTheDocument();
  });

  it('renders invite form and pending invitations for admins', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    mockTeamFetch();

    render(<TeamSettingsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invite member' })).toBeInTheDocument();
  });

  it('submits invite from team page', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    mockTeamFetch();
    const user = userEvent.setup();

    render(<TeamSettingsPage />, { wrapper: createWrapper() });
    await screen.findByText('pending@example.com');

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.click(screen.getByTestId('invite-member-submit'));

    expect(await screen.findByText('Invitation sent.')).toBeInTheDocument();
  });
});
