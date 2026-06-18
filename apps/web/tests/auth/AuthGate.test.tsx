import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { AuthProvider } from '@/auth/AuthContext';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: () => <div data-testid="mock-ledger-page">Ledger</div>,
}));

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
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
    { wrapper: createWrapper() },
  );
}

describe('Auth gate', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows resolving then login when unauthenticated', async () => {
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByTestId('mock-ledger-page')).not.toBeInTheDocument();
  });

  it('shows dashboard when token is present and profile has org', async () => {
    localStorage.setItem('accessToken', 'existing-token');
    localStorage.setItem('refreshToken', 'existing-refresh');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(profileWithOrg()),
          });
        }
        if (url.includes('/venues')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    renderApp();

    expect(await screen.findByRole('heading', { name: 'No venues yet' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('toggles to register view', async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole('heading', { name: 'Sign in' });
    await user.click(screen.getByRole('button', { name: 'Create an account' }));

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  });

  it('returns to login after logout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('accessToken', 'existing-token');
    localStorage.setItem('refreshToken', 'existing-refresh');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(profileWithOrg()),
          });
        }
        if (url.includes('/venues')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          });
        }
        if (url.includes('/auth/logout')) {
          return Promise.resolve({ ok: true, status: 204 });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    renderApp();

    await screen.findByRole('heading', { name: 'No venues yet' });
    await user.click(await screen.findByTestId('profile-badge-trigger'));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
