import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateEvent, useEvents } from '@/api/events';

const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT = {
  eventId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  venueId: VENUE_ID,
  title: 'New Show',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: '',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('events api hooks', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('useEvents fetches venue events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/events') && !url.includes('POST')) {
          return {
            ok: true,
            status: 200,
            json: () => Promise.resolve([EVENT]),
          };
        }
        return { ok: true, status: 200, json: () => Promise.resolve({}) };
      }),
    );

    const { result } = renderHook(() => useEvents(VENUE_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toEqual([EVENT]));
  });

  it('useCreateEvent posts new event', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(EVENT),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateEvent(VENUE_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync({
      title: 'New Show',
      eventDate: '2026-08-01',
      qboTagName: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/venues/${VENUE_ID}/events`),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
