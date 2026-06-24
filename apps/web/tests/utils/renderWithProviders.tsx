import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import { VenueProvider } from '@/venue/VenueContext';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';

// Shared test render helpers (feature 010-vitest-tests-auth, T003).

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Stub global fetch to resolve a single JSON payload. Returns the mock fn. */
export function stubFetchJson(data: unknown, { ok = true, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Stub global fetch with a never-resolving promise (loading state). */
export function stubFetchPending() {
  const fn = vi.fn(() => new Promise(() => {}));
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Reset storage + global stubs for deterministic tests. Call in beforeEach. */
export function resetTestEnv() {
  sessionStorage.clear();
  localStorage.clear();
  vi.unstubAllGlobals();
}

/** A complete, overridable AuthContext value for page/container tests. */
export function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
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
    sessionExpired: false,
    ...overrides,
  };
}

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  withVenue?: boolean;
  auth?: Partial<AuthContextValue> | false;
  queryClient?: QueryClient;
}

/**
 * Render a UI tree wrapped in the providers commonly needed by auth/venue tests:
 * a QueryClientProvider, an optional AuthContext provider, and an optional
 * VenueProvider.
 */
export function renderWithProviders(
  ui: ReactElement,
  { withVenue = false, auth = false, queryClient, ...options }: ProviderOptions = {},
) {
  const client = queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    let tree: ReactNode = children;
    if (withVenue) {
      tree = <VenueProvider>{tree}</VenueProvider>;
    }
    if (auth !== false) {
      tree = <AuthContext.Provider value={makeAuthValue(auth)}>{tree}</AuthContext.Provider>;
    }
    return <QueryClientProvider client={client}>{tree}</QueryClientProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
