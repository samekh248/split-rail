import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allocationsQueryKey,
  bucketsQueryKey,
  expenseSummaryQueryKey,
  useBucketAllocations,
  useCreateExpenseAllocation,
  useCreateRevenueAllocation,
  useCreateRevenueBucket,
  useExpenseSourceSummary,
  useRevenueBuckets,
  useUpdateRevenueAllocation,
  useUpdateRevenueBucket,
} from '@/api/festivalFinancials';
import {
  BUCKET_ID,
  createWrapper,
  EVENT_ID,
  mockFetchJson,
  VENUE_ID,
} from './festivalApiTestUtils';

const LINE_ITEM_ID = 'line-item-1';
const ALLOCATION_ID = 'alloc-1';

describe('festivalFinancials api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds stable query keys', () => {
    expect(bucketsQueryKey(VENUE_ID, EVENT_ID)).toEqual(['festival', VENUE_ID, EVENT_ID, 'buckets']);
    expect(allocationsQueryKey(VENUE_ID, EVENT_ID, BUCKET_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'buckets',
      BUCKET_ID,
      'allocations',
    ]);
    expect(expenseSummaryQueryKey(VENUE_ID, EVENT_ID, LINE_ITEM_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'expense-summary',
      LINE_ITEM_ID,
    ]);
  });

  it('useRevenueBuckets fetches buckets', async () => {
    vi.stubGlobal('fetch', mockFetchJson([{ id: BUCKET_ID, name: 'Tickets' }]));

    const { result } = renderHook(() => useRevenueBuckets(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useCreateRevenueBucket POSTs a bucket', async () => {
    const fetchMock = mockFetchJson({ id: BUCKET_ID, name: 'Merch' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateRevenueBucket(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ name: 'Merch', amount: 1000 });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/buckets`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useUpdateRevenueBucket PUTs bucket changes', async () => {
    const fetchMock = mockFetchJson({ id: BUCKET_ID, name: 'Merch Updated' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateRevenueBucket(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ bucketId: BUCKET_ID, body: { name: 'Merch Updated' } });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/buckets/${BUCKET_ID}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('useBucketAllocations fetches allocations for a bucket', async () => {
    vi.stubGlobal('fetch', mockFetchJson([{ id: ALLOCATION_ID }]));

    const { result } = renderHook(() => useBucketAllocations(VENUE_ID, EVENT_ID, BUCKET_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useCreateRevenueAllocation POSTs an allocation', async () => {
    const fetchMock = mockFetchJson({ id: ALLOCATION_ID, revenueBucketId: BUCKET_ID });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateRevenueAllocation(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      revenueBucketId: BUCKET_ID,
      programmingBlockId: 'block-1',
      allocationType: 'FIXED_AMOUNT',
      amount: 500,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/allocations`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useUpdateRevenueAllocation PUTs an allocation', async () => {
    const fetchMock = mockFetchJson({ id: ALLOCATION_ID, revenueBucketId: BUCKET_ID });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateRevenueAllocation(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      allocationId: ALLOCATION_ID,
      body: { amount: 600 },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/allocations/${ALLOCATION_ID}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('useExpenseSourceSummary fetches split summary', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ sourceTotal: 1000, allocated: 800 }));

    const { result } = renderHook(() => useExpenseSourceSummary(VENUE_ID, EVENT_ID, LINE_ITEM_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useCreateExpenseAllocation POSTs expense splits', async () => {
    const fetchMock = mockFetchJson({ id: 'exp-1' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateExpenseAllocation(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      sourceLineItemId: LINE_ITEM_ID,
      method: 'EQUAL',
      targetType: 'BLOCK',
      targets: [{ programmingBlockId: 'block-1' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/expense-allocations`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
