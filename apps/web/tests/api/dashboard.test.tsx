import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPinOptimisticUpdate,
  dashboardQueryKey,
  useDashboard,
  usePinEvent,
  useUnpinEvent,
} from '@/api/dashboard';
import type { DashboardResponse } from '@/types/generated-api';
import { VENUE_A } from '../fixtures/venues';

const mockDashboard: DashboardResponse = {
  venueId: VENUE_A.id,
  pinnedEvents: [],
  tonightEvents: [],
  upcomingEvents: [
    {
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      venueId: VENUE_A.id,
      title: 'Upcoming',
      eventDate: '2099-01-01',
      status: 'PRE_SHOW',
      isBudgetLocked: false,
      isPinned: false,
      hasVarianceConcern: false,
      unmappedCount: 0,
    },
  ],
  recentEvents: [],
};

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('dashboard api hooks', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('useDashboard uses staleTime 30_000 and correct query key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDashboard),
      })),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useDashboard(VENUE_A.id), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.upcomingEvents?.[0]?.title).toBe('Upcoming');

    const query = queryClient.getQueryCache().find({ queryKey: dashboardQueryKey(VENUE_A.id) });
    expect(query?.options.queryKey).toEqual(dashboardQueryKey(VENUE_A.id));
    expect(query?.options.staleTime).toBe(30_000);
  });

  it('usePinEvent invalidates dashboard query on success', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/dashboard')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockDashboard),
        };
      }
      if (url.includes('/pin') && init?.method === 'PUT') {
        return { ok: true, status: 204, json: () => Promise.resolve(undefined) };
      }
      return { ok: true, status: 200, json: () => Promise.resolve({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(dashboardQueryKey(VENUE_A.id), mockDashboard);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => usePinEvent(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      venueId: VENUE_A.id,
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardQueryKey(VENUE_A.id) });
  });

  it('applyPinOptimisticUpdate toggles cache and rolls back on error', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(dashboardQueryKey(VENUE_A.id), mockDashboard);

    const previous = applyPinOptimisticUpdate(
      queryClient,
      VENUE_A.id,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      true,
    );

    const optimistic = queryClient.getQueryData<DashboardResponse>(dashboardQueryKey(VENUE_A.id));
    expect(optimistic?.pinnedEvents?.some((event) => event.eventId === 'dddddddd-dddd-dddd-dddd-dddddddddddd')).toBe(
      true,
    );

    queryClient.setQueryData(dashboardQueryKey(VENUE_A.id), previous);
    const rolledBack = queryClient.getQueryData<DashboardResponse>(dashboardQueryKey(VENUE_A.id));
    expect(rolledBack?.pinnedEvents).toHaveLength(0);
  });

  it('useUnpinEvent rolls back optimistic cache on error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Pin failed' }),
      })),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(dashboardQueryKey(VENUE_A.id), {
      ...mockDashboard,
      pinnedEvents: [
        {
          ...mockDashboard.upcomingEvents![0]!,
          isPinned: true,
        },
      ],
    });

    const { result } = renderHook(() => useUnpinEvent(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({
      venueId: VENUE_A.id,
      eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const restored = queryClient.getQueryData<DashboardResponse>(dashboardQueryKey(VENUE_A.id));
    expect(restored?.pinnedEvents?.[0]?.isPinned).toBe(true);
  });
});
