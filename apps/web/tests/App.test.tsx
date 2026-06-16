import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { AuthProvider } from '@/auth/AuthContext';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({ venueId, eventId }: { venueId: string; eventId: string }) => (
    <div data-testid="mock-ledger-page">
      {venueId}:{eventId}
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows login when unauthenticated', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders dashboard with route params when authenticated', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    window.history.pushState({}, '', '/?venueId=ven-123&eventId=evt-456');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('mock-ledger-page')).toHaveTextContent('ven-123:evt-456');
  });
});
