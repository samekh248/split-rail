import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/shell/AppShell';
import { DashboardHome } from '@/pages/DashboardHome';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';

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
      <AuthContext.Provider value={authValue}>
        <VenueProvider>{children}</VenueProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('DashboardHome theme', () => {
  it('renders branded vertical sidebar with logo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/users/me')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ role: { permissions: {} } }),
          });
        }
        if (url.includes('/events')) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }),
    );

    render(
      <AppShell organizationName="Acme Corp">
        <DashboardHome organizationName="Acme Corp" />
      </AppShell>,
      { wrapper: createWrapper() },
    );

    expect(document.querySelector('[data-testid="sidebar-rail"]')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Split-Rail' })).toBeInTheDocument();
    expect(screen.getByTestId('top-bar-org-name')).toHaveTextContent('Acme Corp');
  });

  it('wraps content in cream canvas app shell', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { container } = render(
      <AppShell organizationName="Acme">
        <DashboardHome organizationName="Acme" />
      </AppShell>,
      { wrapper: createWrapper() },
    );

    expect(container.querySelector('.app-shell')).toBeInTheDocument();
  });
});
