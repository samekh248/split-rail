import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  artistRollupQueryKey,
  myBlocksQueryKey,
  settlementPreflightQueryKey,
  settlementSheetQueryKey,
  useArtistSettlementRollup,
  useBlockSettlementPreflight,
  useBlockSettlementSheet,
  useFinalizeBlockSettlement,
  useMySettlementBlocks,
  useReopenBlockSettlement,
} from '@/api/blockSettlements';
import {
  ARTIST_ID,
  BLOCK_ID,
  createWrapper,
  EVENT_ID,
  mockFetchJson,
  VENUE_ID,
} from './festivalApiTestUtils';

describe('blockSettlements api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds settlement query keys', () => {
    expect(settlementSheetQueryKey(VENUE_ID, EVENT_ID, BLOCK_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'settlement',
      BLOCK_ID,
    ]);
    expect(settlementPreflightQueryKey(VENUE_ID, EVENT_ID, BLOCK_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'settlement',
      BLOCK_ID,
      'preflight',
    ]);
    expect(myBlocksQueryKey(VENUE_ID, EVENT_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'my-blocks',
    ]);
    expect(artistRollupQueryKey(VENUE_ID, EVENT_ID, ARTIST_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'artist-rollup',
      ARTIST_ID,
    ]);
  });

  it('useBlockSettlementSheet fetches the sheet', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ blockId: BLOCK_ID, settlementStatus: 'DRAFT' }));

    const { result } = renderHook(() => useBlockSettlementSheet(VENUE_ID, EVENT_ID, BLOCK_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useBlockSettlementPreflight fetches blockers', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ ready: false, blockers: [] }));

    const { result } = renderHook(() => useBlockSettlementPreflight(VENUE_ID, EVENT_ID, BLOCK_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useMySettlementBlocks fetches work queue', async () => {
    vi.stubGlobal('fetch', mockFetchJson([{ blockId: BLOCK_ID }]));

    const { result } = renderHook(() => useMySettlementBlocks(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useArtistSettlementRollup fetches per-appearance rollup', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ appearances: [] }));

    const { result } = renderHook(() => useArtistSettlementRollup(VENUE_ID, EVENT_ID, ARTIST_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useFinalizeBlockSettlement POSTs finalize', async () => {
    const fetchMock = mockFetchJson({ settlementStatus: 'FINALIZED' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useFinalizeBlockSettlement(VENUE_ID, EVENT_ID, BLOCK_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ confirm: true });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks/${BLOCK_ID}/settlement/finalize`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useReopenBlockSettlement POSTs reopen', async () => {
    const fetchMock = mockFetchJson({ blockId: BLOCK_ID, settlementStatus: 'DRAFT' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useReopenBlockSettlement(VENUE_ID, EVENT_ID, BLOCK_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      reasonCode: 'CORRECTION',
      note: 'Fix allocation',
      acknowledgeDispatchedRevision: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks/${BLOCK_ID}/settlement/reopen`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
