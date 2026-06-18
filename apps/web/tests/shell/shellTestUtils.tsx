import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import { AppShell, type AppShellProps } from '@/components/shell/AppShell';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { VenueProvider } from '@/venue/VenueContext';
import {
  mockWorkspaceFetch,
  type MockWorkspaceFetchOptions,
} from '../utils/mockWorkspaceFetch';

function buildAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
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
    completeAcceptInvitation: vi.fn(),
    sessionExpired: false,
    ...overrides,
  };
}

export function createShellWrapper(
  authOverrides: Partial<AuthContextValue> = {},
  workspaceOptions: MockWorkspaceFetchOptions = { venues: [] },
  shellProps: Partial<AppShellProps> = {},
) {
  mockWorkspaceFetch(workspaceOptions);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const authValue = buildAuthValue(authOverrides);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <VenueProvider>
            <AppShell {...shellProps}>{children}</AppShell>
          </VenueProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}

export function createSidebarTestWrapper(authOverrides: Partial<AuthContextValue> = {}) {
  mockWorkspaceFetch({ venues: [] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={buildAuthValue(authOverrides)}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}

export function renderWithShell(ui: ReactElement, options?: RenderOptions & { wrapper?: never }) {
  return render(ui, { wrapper: createShellWrapper(), ...options });
}
