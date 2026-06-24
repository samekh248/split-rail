import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, SessionExpiredError } from '@/api/client';
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

function SessionExpiryProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="phase">{auth.phase}</span>
      <span data-testid="session-expired">{String(auth.sessionExpired)}</span>
      <button type="button" onClick={() => void auth.login({ email: 'u@x.com', password: 'Password1' })}>
        login
      </button>
      <button type="button" onClick={() => void auth.logout()}>
        logout
      </button>
    </div>
  );
}

describe('AuthContext session expiry', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers recovery handlers on mount via configureApiClient', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'rotated',
            refreshToken: 'rotated-r',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<SessionExpiryProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));

    await expect(apiFetch('/recovered')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('automatic sign-out clears credentials, routes to login, and sets sessionExpired', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Expired' }),
      })
      .mockResolvedValue({
        ok: true,
        status: 204,
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<SessionExpiryProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));

    localStorage.removeItem('refreshToken');

    await expect(apiFetch('/secure')).rejects.toBeInstanceOf(SessionExpiredError);

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));
    await waitFor(() => expect(screen.getByTestId('session-expired')).toHaveTextContent('true'));
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/auth/logout')),
    ).toBe(true);
  });

  it('explicit logout leaves sessionExpired false', async () => {
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

    renderAuth(<SessionExpiryProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));

    await act(async () => {
      screen.getByRole('button', { name: 'logout' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('session-expired')).toHaveTextContent('false');
  });

  it('successful login resets sessionExpired', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderAuth(<SessionExpiryProbe />);
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));

    localStorage.removeItem('refreshToken');
    await expect(apiFetch('/trigger-expiry')).rejects.toBeInstanceOf(SessionExpiredError);
    await waitFor(() => expect(screen.getByTestId('session-expired')).toHaveTextContent('true'));

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('session-expired')).toHaveTextContent('false');
  });
});
