import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVenues } from '@/api/venues';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useVenues', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches venues from GET /api/venues', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              id: 'ven-1',
              name: 'Main Hall',
              organizationId: 'org-1',
              createdAt: '2026-01-01T00:00:00Z',
            },
          ]),
      }),
    );

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.name).toBe('Main Hall');
  });

  it('omits X-Active-Venue-Id via skipVenueContext (C3.1)', async () => {
    const { setActiveVenueId } = await import('@/venue/activeVenueStorage');
    setActiveVenueId('33333333-3333-3333-3333-333333333333');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(fetchMock).toHaveBeenCalledWith('/api/venues', expect.anything());
    expect(headers['X-Active-Venue-Id']).toBeUndefined();
  });
});
