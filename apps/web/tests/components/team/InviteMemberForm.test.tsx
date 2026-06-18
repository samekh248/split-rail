import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMemberForm } from '@/components/team/InviteMemberForm';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: vi.fn(() => true),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function mockFetch() {
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
          json: () =>
            Promise.resolve([{ id: 'ven-1', name: 'Hall A', organizationId: 'org-1' }]),
        };
      }
      if (url.includes('/api/invitations') && !url.includes('/accept')) {
        return {
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'inv-1',
              email: 'new@example.com',
              roleName: 'Promoter',
              status: 'pending',
              venueScopes: [{ venueId: 'ven-1', venueName: 'Hall A' }],
            }),
        };
      }
      return { ok: true, status: 200, json: () => Promise.resolve([]) };
    }),
  );
}

describe('InviteMemberForm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('validates email before submit', async () => {
    mockFetch();
    const user = userEvent.setup();
    render(<InviteMemberForm />, { wrapper: createWrapper() });

    await user.click(screen.getByTestId('invite-member-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email is required.');
  });

  it('validates malformed email before submit', async () => {
    mockFetch();
    const user = userEvent.setup();
    render(<InviteMemberForm />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByTestId('invite-member-submit'));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('disables submit while invitation request is pending', async () => {
    const user = userEvent.setup();
    let resolvePost: (value: unknown) => void = () => {};
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
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
            json: () =>
              Promise.resolve([{ id: 'ven-1', name: 'Hall A', organizationId: 'org-1' }]),
          };
        }
        if (url.includes('/api/invitations') && init?.method === 'POST') {
          return postPromise;
        }
        return { ok: true, status: 200, json: () => Promise.resolve([]) };
      }),
    );

    render(<InviteMemberForm />, { wrapper: createWrapper() });
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.click(screen.getByTestId('invite-member-submit'));

    expect(screen.getByTestId('invite-member-submit')).toBeDisabled();

    resolvePost({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          id: 'inv-1',
          email: 'new@example.com',
          roleName: 'Promoter',
          status: 'pending',
          venueScopes: [],
        }),
    });
  });

  it('shows banner error on server failure distinct from email validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
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
            json: () =>
              Promise.resolve([{ id: 'ven-1', name: 'Hall A', organizationId: 'org-1' }]),
          };
        }
        if (url.includes('/api/invitations') && init?.method === 'POST') {
          return {
            ok: false,
            status: 500,
            statusText: 'Error',
            json: () => Promise.resolve({ detail: 'Server error' }),
          };
        }
        return { ok: true, status: 200, json: () => Promise.resolve([]) };
      }),
    );

    const user = userEvent.setup();
    render(<InviteMemberForm />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.click(screen.getByTestId('invite-member-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to send invitation');
    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
  });

  it('submits invitation with selected role', async () => {
    mockFetch();
    const user = userEvent.setup();
    render(<InviteMemberForm />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await waitFor(() => expect(screen.getByLabelText('Role')).toBeInTheDocument());
    await user.click(screen.getByTestId('invite-member-submit'));

    expect(await screen.findByText('Invitation sent.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/invitations',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
