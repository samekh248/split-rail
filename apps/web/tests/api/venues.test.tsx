import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateVenue } from '@/api/venues';
import { VenueProvider } from '@/venue/VenueContext';
import { getActiveVenueId } from '@/venue/activeVenueStorage';

const CREATED_VENUE = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  name: 'New Hall',
  organizationId: 'org-1',
  createdAt: '2026-06-17T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <VenueProvider>{children}</VenueProvider>
    </QueryClientProvider>
  );
}

describe('useCreateVenue', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('posts to /api/venues with skipVenueContext, upserts cache, and activates venue', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(CREATED_VENUE),
      });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateVenue(), { wrapper });

    await waitFor(() => expect(result.current.mutate).toBeDefined());

    await result.current.mutateAsync({ name: 'New Hall' });

    const postCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/venues') && call[1]?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    expect((postCall?.[1]?.headers as Record<string, string>)?.['X-Active-Venue-Id']).toBeUndefined();
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ name: 'New Hall' });

    await waitFor(() => expect(getActiveVenueId()).toBe(CREATED_VENUE.id));
  });
});
