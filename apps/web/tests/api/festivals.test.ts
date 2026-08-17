import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  artistAppearancesQueryKey,
  artistsQueryKey,
  blockHistoryQueryKey,
  blocksQueryKey,
  festivalQueryKey,
  itineraryQueryKey,
  stagesQueryKey,
  useArtistAppearances,
  useBlockHistory,
  useCopyDealTerms,
  useCreateBlock,
  useCreateFestival,
  useCreateFestivalArtist,
  useCreateStage,
  useDeleteBlock,
  useDeleteStage,
  useFestival,
  useFestivalArtists,
  useItinerary,
  usePublicItinerary,
  useRevertFestivalToStandard,
  useSetBlockStatus,
  useSetPublishVisibility,
  useStages,
  usePinProgrammingBlock,
  useUnpinProgrammingBlock,
  useUpdateBlock,
  useUpdateFestival,
  useUpdateStage,
} from '@/api/festivals';
import {
  ARTIST_ID,
  BLOCK_ID,
  createWrapper,
  EVENT_ID,
  mockFetchJson,
  VENUE_ID,
} from './festivalApiTestUtils';

describe('festivals api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds stable query keys', () => {
    expect(festivalQueryKey(VENUE_ID, EVENT_ID)).toEqual(['festival', VENUE_ID, EVENT_ID]);
    expect(stagesQueryKey(VENUE_ID, EVENT_ID)).toEqual(['festival', VENUE_ID, EVENT_ID, 'stages']);
    expect(blocksQueryKey(VENUE_ID, EVENT_ID)).toEqual(['festival', VENUE_ID, EVENT_ID, 'blocks']);
    expect(artistsQueryKey(VENUE_ID, EVENT_ID)).toEqual(['festival', VENUE_ID, EVENT_ID, 'artists']);
    expect(artistAppearancesQueryKey(VENUE_ID, EVENT_ID, ARTIST_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'artists',
      ARTIST_ID,
      'appearances',
    ]);
    expect(itineraryQueryKey(VENUE_ID, EVENT_ID, { day: '2026-08-14' })).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'itinerary',
      { day: '2026-08-14' },
    ]);
    expect(blockHistoryQueryKey(VENUE_ID, EVENT_ID, BLOCK_ID)).toEqual([
      'festival',
      VENUE_ID,
      EVENT_ID,
      'blocks',
      BLOCK_ID,
      'history',
    ]);
  });

  it('useFestival fetches the festival wrapper', async () => {
    const festival = { eventId: EVENT_ID, title: 'Summer Fest' };
    vi.stubGlobal('fetch', mockFetchJson(festival));

    const { result } = renderHook(() => useFestival(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(festival);
  });

  it('useCreateFestival POSTs a new festival', async () => {
    const created = { eventId: EVENT_ID, title: 'New Fest' };
    const fetchMock = mockFetchJson(created);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateFestival(VENUE_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync({ title: 'New Fest', startDate: '2026-08-14', endDate: '2026-08-16' });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useUpdateFestival PUTs festival metadata', async () => {
    const updated = { eventId: EVENT_ID, title: 'Renamed Fest' };
    const fetchMock = mockFetchJson(updated);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateFestival(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ title: 'Renamed Fest' });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('useRevertFestivalToStandard POSTs revert', async () => {
    const fetchMock = mockFetchJson(undefined, 204);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useRevertFestivalToStandard(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/revert-to-standard`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useStages fetches stage zones', async () => {
    const stages = [{ id: 'stage-1', name: 'Main Stage' }];
    vi.stubGlobal('fetch', mockFetchJson(stages));

    const { result } = renderHook(() => useStages(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stages);
  });

  it('useCreateStage POSTs a stage', async () => {
    const fetchMock = mockFetchJson({ id: 'stage-1', name: 'Side Stage' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateStage(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync({ name: 'Side Stage' });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/stages`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useUpdateStage PUTs a stage', async () => {
    const fetchMock = mockFetchJson({ id: 'stage-1', name: 'Renamed' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateStage(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync({ stageId: 'stage-1', name: 'Renamed' });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/stages/stage-1`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('useDeleteStage DELETEs a stage', async () => {
    const fetchMock = mockFetchJson(undefined, 204);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteStage(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync('stage-1');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/stages/stage-1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('useFestivalArtists fetches artists', async () => {
    vi.stubGlobal('fetch', mockFetchJson([{ id: ARTIST_ID, name: 'Headliner' }]));

    const { result } = renderHook(() => useFestivalArtists(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useCreateFestivalArtist POSTs an artist', async () => {
    const fetchMock = mockFetchJson({ id: ARTIST_ID, name: 'Opener' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateFestivalArtist(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ name: 'Opener' });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/artists`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useArtistAppearances fetches linked blocks', async () => {
    vi.stubGlobal('fetch', mockFetchJson([{ blockId: BLOCK_ID }]));

    const { result } = renderHook(() => useArtistAppearances(VENUE_ID, EVENT_ID, ARTIST_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useCopyDealTerms POSTs copy request', async () => {
    const fetchMock = mockFetchJson(2);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCopyDealTerms(VENUE_ID, EVENT_ID, ARTIST_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ sourceBlockId: BLOCK_ID, targetBlockIds: ['other-block'] });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/artists/${ARTIST_ID}/copy-deal-terms`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useCreateBlock POSTs a programming block', async () => {
    const fetchMock = mockFetchJson({ id: BLOCK_ID, title: 'Set 1' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCreateBlock(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync({
      title: 'Set 1',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      startTime: '20:00',
      endTime: '21:00',
      category: 'MUSIC',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useUpdateBlock PUTs a block', async () => {
    const fetchMock = mockFetchJson({ id: BLOCK_ID, title: 'Moved Set' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateBlock(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync({
      blockId: BLOCK_ID,
      title: 'Moved Set',
      dayDate: '2026-08-15',
      stageZoneId: 'stage-2',
      startTime: '21:00',
      endTime: '22:00',
      category: 'MUSIC',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks/${BLOCK_ID}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('useDeleteBlock DELETEs a block', async () => {
    const fetchMock = mockFetchJson(undefined, 204);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteBlock(VENUE_ID, EVENT_ID), { wrapper: createWrapper() });
    await result.current.mutateAsync(BLOCK_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks/${BLOCK_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('useItinerary fetches with filters', async () => {
    const fetchMock = mockFetchJson({ days: [], stages: [], blocks: [] });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () =>
        useItinerary(VENUE_ID, EVENT_ID, {
          day: '2026-08-14',
          stageZoneId: 'stage-1',
          category: 'MUSIC',
          status: 'SCHEDULED',
        }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/itinerary?day=2026-08-14&stageZoneId=stage-1&category=MUSIC&status=SCHEDULED`,
      ),
      expect.anything(),
    );
  });

  it('usePublicItinerary requests the public view', async () => {
    const fetchMock = mockFetchJson({ days: [], stages: [], blocks: [] });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => usePublicItinerary(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('view=public'),
      expect.anything(),
    );
  });

  it('useSetPublishVisibility POSTs visibility changes', async () => {
    const fetchMock = mockFetchJson({ updated: 1 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSetPublishVisibility(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ blockIds: [BLOCK_ID], isPubliclyVisible: true });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/itinerary/publish-visibility`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useBlockHistory fetches audit entries', async () => {
    vi.stubGlobal('fetch', mockFetchJson([{ action: 'Rescheduled' }]));

    const { result } = renderHook(() => useBlockHistory(VENUE_ID, EVENT_ID, BLOCK_ID), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useSetBlockStatus POSTs status transitions', async () => {
    const fetchMock = mockFetchJson({ id: BLOCK_ID, scheduleStatus: 'CANCELED' });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSetBlockStatus(VENUE_ID, EVENT_ID), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({
      blockId: BLOCK_ID,
      status: 'CANCELED',
      reason: 'Weather',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks/${BLOCK_ID}/status`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('usePinProgrammingBlock PUTs pin and marks the itinerary block pinned', async () => {
    const fetchMock = mockFetchJson(undefined, 204);
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(itineraryQueryKey(VENUE_ID, EVENT_ID), {
      blocks: [{ id: BLOCK_ID, title: 'Headliner', isPinned: false }],
    });

    const { result } = renderHook(() => usePinProgrammingBlock(), {
      wrapper: createWrapper(queryClient),
    });
    await result.current.mutateAsync({
      venueId: VENUE_ID,
      eventId: EVENT_ID,
      blockId: BLOCK_ID,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}/festivals/${EVENT_ID}/blocks/${BLOCK_ID}/pin`,
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(
      queryClient.getQueryData<{ blocks?: { isPinned?: boolean }[] }>(
        itineraryQueryKey(VENUE_ID, EVENT_ID),
      )?.blocks?.[0]?.isPinned,
    ).toBe(true);
  });

  it('useUnpinProgrammingBlock rolls back itinerary pin state on error', async () => {
    vi.stubGlobal('fetch', mockFetchJson({ detail: 'Pin failed' }, 500));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(itineraryQueryKey(VENUE_ID, EVENT_ID), {
      blocks: [{ id: BLOCK_ID, title: 'Headliner', isPinned: true }],
    });

    const { result } = renderHook(() => useUnpinProgrammingBlock(), {
      wrapper: createWrapper(queryClient),
    });
    await expect(
      result.current.mutateAsync({
        venueId: VENUE_ID,
        eventId: EVENT_ID,
        blockId: BLOCK_ID,
      }),
    ).rejects.toThrow();

    expect(
      queryClient.getQueryData<{ blocks?: { isPinned?: boolean }[] }>(
        itineraryQueryKey(VENUE_ID, EVENT_ID),
      )?.blocks?.[0]?.isPinned,
    ).toBe(true);
  });
});
