import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthContext';
import { useAuth } from '@/auth/useAuth';

function profileWithOrg() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    organization: { id: 'org-1', name: 'Acme' },
    role: { roleName: 'Admin', permissions: {} },
    venueScopes: [],
  };
}

function profileWithoutOrg() {
  return {
    id: 'user-2',
    email: 'orgless@example.com',
    organization: null,
    role: null,
    venueScopes: [],
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderAuth(ui: ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>, { wrapper: createWrapper() });
}

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="phase">{auth.phase}</span>
      <span data-testid="just-onboarded">{String(auth.justOnboarded)}</span>
      <span data-testid="org-name">{auth.profile?.organization?.name ?? 'none'}</span>
      <button type="button" onClick={() => void auth.login({ email: 'u@x.com', password: 'Password1' })}>
        login
      </button>
      <button
        type="button"
        onClick={() =>
          void auth.onboard({
            email: 'new@example.com',
            password: 'Password1',
            organizationName: 'New Org',
          })
        }
      >
        onboard
      </button>
      <button type="button" onClick={() => void auth.createOrganization('Retry Org')}>
        create-org
      </button>
      <button type="button" onClick={() => void auth.logout()}>
        logout
      </button>
      <button type="button" onClick={() => auth.dismissWelcome()}>
        dismiss
      </button>
    </div>
  );
}

describe('AuthContext onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves to unauthenticated without token', async () => {
    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));
  });

  it('resolves to authenticated with org on bootstrap', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      }),
    );

    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('org-name')).toHaveTextContent('Acme');
  });

  it('resolves to needs-organization when profile has no org', async () => {
    localStorage.setItem('accessToken', 'token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithoutOrg()),
      }),
    );

    renderAuth(<AuthProbe />);
    await waitFor(() =>
      expect(screen.getByTestId('phase')).toHaveTextContent('needs-organization'),
    );
  });

  it('login routes org present to authenticated without justOnboarded', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('just-onboarded')).toHaveTextContent('false');
  });

  it('login routes org null to needs-organization', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithoutOrg()),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('phase')).toHaveTextContent('needs-organization'),
    );
  });

  it('onboard sets justOnboarded on success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({ id: 'u', email: 'new@example.com', createdAt: '2026-01-01T00:00:00Z' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'a',
            refreshToken: 'r',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({ id: 'org', name: 'New Org', createdAt: '2026-01-01T00:00:00Z' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'a2',
            refreshToken: 'r2',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));

    await act(async () => {
      screen.getByRole('button', { name: 'onboard' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('just-onboarded')).toHaveTextContent('true');
  });

  it('dismissWelcome clears justOnboarded', async () => {
    localStorage.setItem('accessToken', 'token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      }),
    );

    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));

    await act(async () => {
      screen.getByRole('button', { name: 'dismiss' }).click();
    });

    expect(screen.getByTestId('just-onboarded')).toHaveTextContent('false');
  });

  it('logout clears tokens, profile, and justOnboarded', async () => {
    const user = userEvent.setup();
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      })
      .mockResolvedValue({
        ok: true,
        status: 204,
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(screen.getByTestId('just-onboarded')).toHaveTextContent('false');
    expect(screen.getByTestId('org-name')).toHaveTextContent('none');
  });
});
