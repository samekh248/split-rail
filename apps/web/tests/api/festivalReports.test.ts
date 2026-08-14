import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useFestivalDayReport,
  useFestivalPnlReport,
  useFestivalSettlementStatusReport,
  useFestivalStageReport,
  useFestivalUnreconciledReport,
  useFestivalVarianceReport,
} from '@/api/festivalReports';
import { createWrapper, EVENT_ID, mockFetchJson, VENUE_ID } from './festivalApiTestUtils';

describe('festivalReports api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useFestivalPnlReport fetches P&L with category filter', async () => {
    const fetchMock = mockFetchJson({ net: 5000 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useFestivalPnlReport(VENUE_ID, EVENT_ID, 'MUSIC'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/reports/pnl?category=MUSIC'),
      expect.anything(),
    );
  });

  it('useFestivalDayReport fetches day rollup', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ days: [] }));

    const { result } = renderHook(
      () => useFestivalDayReport(VENUE_ID, EVENT_ID, { category: 'MUSIC', status: 'SCHEDULED' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useFestivalStageReport fetches stage rollup', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ stages: [] }));

    const { result } = renderHook(() => useFestivalStageReport(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useFestivalSettlementStatusReport fetches settlement counts', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ byStatus: [] }));

    const { result } = renderHook(() => useFestivalSettlementStatusReport(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useFestivalUnreconciledReport fetches unreconciled rows', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ transactions: [] }));

    const { result } = renderHook(() => useFestivalUnreconciledReport(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useFestivalVarianceReport fetches variance rows', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ rows: [] }));

    const { result } = renderHook(() => useFestivalVarianceReport(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
