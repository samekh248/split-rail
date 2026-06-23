import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: () => <div data-testid="mock-ledger-page" />,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
  } satisfies AuthContextValue;

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('DashboardHome theme', () => {
  it('renders branded nav chrome header and logo', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'ven-1', name: 'Main Hall' }],
    });

    render(<DashboardHome organizationName="Acme Corp" />, { wrapper: createWrapper() });

    expect(document.querySelector('.app__header')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Split-Rail' })).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toHaveClass('app__subtitle');
  });

  it('wraps content in cream canvas app container', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { container } = render(<DashboardHome organizationName="Acme" />, {
      wrapper: createWrapper(),
    });

    expect(container.querySelector('.app')).toBeInTheDocument();
  });
});
