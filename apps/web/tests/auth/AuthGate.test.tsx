import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { AuthProvider } from '@/auth/AuthContext';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: () => <div data-testid="mock-ledger-page">Ledger</div>,
}));

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
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

  it('shows dashboard when token is present', async () => {
    localStorage.setItem('accessToken', 'existing-token');
    localStorage.setItem('refreshToken', 'existing-refresh');

    renderApp();

    expect(await screen.findByTestId('mock-ledger-page')).toBeInTheDocument();
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
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );

    renderApp();

    await screen.findByTestId('mock-ledger-page');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
