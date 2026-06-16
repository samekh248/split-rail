import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ledgerKeys,
  useCreateArtist,
  useCreateLineItem,
  useDeleteArtist,
  useDeleteLineItem,
  useLedger,
  useLockBudget,
  useRecalculateLedger,
  useUpdateArtist,
  useUpdateLineItem,
} from '@/api/ledger';
import {
  qboKeys,
  useCreateMapping,
  useSyncStatus,
  useTriggerSync,
  useUnmappedCount,
  useUpdateMapping,
  useVenueMappings,
} from '@/api/qbo';
import {
  useFinalizeSettlement,
  useReverseSettlement,
  useSettlementPdfLink,
} from '@/api/settlement';
import {
  useCanSignSettlement,
  useCanTriggerQboSync,
  useUserProfile,
} from '@/api/user';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function mockFetch(response: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'OK',
      json: () => Promise.resolve(response),
    }),
  );
}

describe('api hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes stable ledger and qbo query keys', () => {
    expect(ledgerKeys.grid('ven-1', 'evt-1')).toEqual(['ledger', 'ven-1', 'evt-1']);
    expect(qboKeys.syncStatus('ven-1', 'evt-1')).toEqual([
      'qbo',
      'sync-status',
      'ven-1',
      'evt-1',
    ]);
  });

  it('useLedger fetches the ledger grid', async () => {
    mockFetch({ title: 'Show', blocks: [], artists: [], summary: {} });

    const { result } = renderHook(() => useLedger('ven-1', 'evt-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ title: 'Show' });
  });

  it('useUserProfile and permission helpers read role flags', async () => {
    mockFetch({
      role: {
        permissions: {
          canTriggerQboSync: true,
          canSignSettlement: false,
        },
      },
    });

    const { result } = renderHook(
      () => ({
        profile: useUserProfile(),
        canSync: useCanTriggerQboSync(),
        canSign: useCanSignSettlement(),
      }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
    expect(result.current.canSync).toBe(true);
    expect(result.current.canSign).toBe(false);
  });

  it('ledger mutations call the expected endpoints', async () => {
    mockFetch({ id: 'row-1' });

    const wrapper = createWrapper();
    const recalculate = renderHook(() => useRecalculateLedger('ven-1', 'evt-1'), { wrapper });
    await recalculate.result.current.mutateAsync();
    expect(fetch).toHaveBeenCalledWith(
      '/api/venues/ven-1/events/evt-1/recalculate',
      expect.objectContaining({ method: 'POST' }),
    );

    mockFetch({ id: 'row-2' });
    const createLineItem = renderHook(() => useCreateLineItem('ven-1', 'evt-1'), { wrapper });
    await createLineItem.result.current.mutateAsync({
      blockType: 'EXPENSES',
      rowLabel: 'Catering',
      sortOrder: 1,
      isArtistDeduction: false,
      proformaValue: '100.00',
      settlementValue: '0.00',
      notes: null,
    });

    mockFetch({ id: 'row-2' });
    const updateLineItem = renderHook(() => useUpdateLineItem('ven-1', 'evt-1'), { wrapper });
    await updateLineItem.result.current.mutateAsync({
      id: 'row-2',
      rowLabel: 'Catering',
      sortOrder: 1,
      isArtistDeduction: false,
      proformaValue: '100.00',
      settlementValue: '90.00',
      notes: null,
      isHiddenFromPromoter: false,
      rowVersion: 'v1',
    });

    mockFetch(undefined, 204);
    const deleteLineItem = renderHook(() => useDeleteLineItem('ven-1', 'evt-1'), { wrapper });
    await deleteLineItem.result.current.mutateAsync('row-2');

    mockFetch({ id: 'artist-1' });
    const createArtist = renderHook(() => useCreateArtist('ven-1', 'evt-1'), { wrapper });
    await createArtist.result.current.mutateAsync({
      artistName: 'Headliner',
      performanceOrder: 1,
      dealType: 'guarantee',
      baseGuarantee: '1000.00',
      backendPercentage: '70.00',
      taxWithholdingPercentage: '0.00',
    });

    mockFetch({ id: 'artist-1' });
    const updateArtist = renderHook(() => useUpdateArtist('ven-1', 'evt-1'), { wrapper });
    await updateArtist.result.current.mutateAsync({
      id: 'artist-1',
      artistName: 'Headliner',
      performanceOrder: 1,
      dealType: 'guarantee',
      customFormulaExpression: null,
      baseGuarantee: '1200.00',
      backendPercentage: '70.00',
      taxWithholdingPercentage: '0.00',
      rowVersion: 'v1',
    });

    mockFetch(undefined, 204);
    const deleteArtist = renderHook(() => useDeleteArtist('ven-1', 'evt-1'), { wrapper });
    await deleteArtist.result.current.mutateAsync('artist-1');

    mockFetch({ isBudgetLocked: true });
    const lockBudget = renderHook(() => useLockBudget('ven-1', 'evt-1'), { wrapper });
    await lockBudget.result.current.mutateAsync();
  });

  it('qbo hooks fetch and mutate mapping/sync endpoints', async () => {
    const wrapper = createWrapper();

    mockFetch({ status: 'idle' });
    const syncStatus = renderHook(() => useSyncStatus('ven-1', 'evt-1'), { wrapper });
    await waitFor(() => expect(syncStatus.result.current.isSuccess).toBe(true));

    mockFetch({ count: 2 });
    const unmappedCount = renderHook(() => useUnmappedCount('ven-1', 'evt-1'), { wrapper });
    await waitFor(() => expect(unmappedCount.result.current.isSuccess).toBe(true));

    mockFetch({ mappings: [] });
    const mappings = renderHook(() => useVenueMappings('ven-1'), { wrapper });
    await waitFor(() => expect(mappings.result.current.isSuccess).toBe(true));

    mockFetch({ synced: 1 });
    const triggerSync = renderHook(() => useTriggerSync('ven-1', 'evt-1'), { wrapper });
    await triggerSync.result.current.mutateAsync();

    mockFetch({ id: 'map-1' });
    const createMapping = renderHook(() => useCreateMapping('ven-1', 'evt-1'), { wrapper });
    await createMapping.result.current.mutateAsync({
      qboAccountId: 'acct-1',
      mappedCategoryLabel: 'Production',
    });

    mockFetch({ id: 'map-1' });
    const updateMapping = renderHook(() => useUpdateMapping('ven-1'), { wrapper });
    await updateMapping.result.current.mutateAsync({
      mappingId: 'map-1',
      mappedCategoryLabel: 'Marketing',
      mappedLineItemId: null,
    });
  });

  it('settlement hooks call finalize, pdf, and reverse endpoints', async () => {
    const wrapper = createWrapper();

    mockFetch({ status: 'SETTLED' });
    const finalize = renderHook(() => useFinalizeSettlement('ven-1', 'evt-1'), { wrapper });
    await finalize.result.current.mutateAsync({
      signatureData: 'abc',
      confirmed: true,
    });

    mockFetch({ url: 'https://example.test/pdf', expiresAt: '2026-01-01T00:00:00Z' });
    const pdfLink = renderHook(() => useSettlementPdfLink('ven-1', 'evt-1', true), { wrapper });
    await waitFor(() => expect(pdfLink.result.current.isSuccess).toBe(true));

    mockFetch({ status: 'PRE_SHOW' });
    const reverse = renderHook(() => useReverseSettlement('ven-1', 'evt-1'), { wrapper });
    await reverse.result.current.mutateAsync({ reason: 'Correction' });
  });
});
