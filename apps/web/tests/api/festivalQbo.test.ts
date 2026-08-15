import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  festivalQboQueryKey,
  useBlockQboSources,
  useFestivalQboTransactions,
  useResolveQboReview,
} from '@/api/festivalQbo';
import {
  BLOCK_ID,
  createWrapper,
  EVENT_ID,
  mockFetchJson,
  VENUE_ID,
} from './festivalApiTestUtils';

describe('festivalQbo api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds qbo query keys with filters', () => {
    expect(festivalQboQueryKey(VENUE_ID, EVENT_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'qbo-transactions',
      {},
    ]);
    expect(festivalQboQueryKey(VENUE_ID, EVENT_ID, { reviewState: 'UNTAGGED' })).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'qbo-transactions',
      { reviewState: 'UNTAGGED' },
    ]);
  });

  it('useFestivalQboTransactions fetches with review filter', async () => {
    const fetchMock = mockFetchJson([{ id: 'tx-1', reviewState: 'UNTAGGED' }]);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => useFestivalQboTransactions(VENUE_ID, EVENT_ID, { reviewState: 'UNTAGGED' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('reviewState=UNTAGGED'),
      expect.anything(),
    );
  });

  it('useResolveQboReview POSTs resolution', async () => {
    const fetchMock = mockFetchJson({ resolved: true });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useResolveQboReview(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      transactionId: 'tx-1',
      resolution: 'ACCEPT_AS_OVERHEAD',
      reason: 'Untagged vendor',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/qbo-transactions/tx-1/review`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useBlockQboSources fetches block traceability', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ sources: [] }));

    const { result } = renderHook(() => useBlockQboSources(VENUE_ID, EVENT_ID, BLOCK_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
