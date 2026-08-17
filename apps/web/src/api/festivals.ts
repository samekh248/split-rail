import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { dashboardQueryKey } from './dashboard';
import type {
  ArtistAppearanceDto,
  CopyDealTermsRequest,
  CreateFestivalArtistRequest,
  CreateProgrammingBlockRequest,
  FestivalArtistResponse,
  CreateFestivalRequest,
  CreateStageZoneRequest,
  FestivalAuditEntryResponse,
  FestivalResponse,
  ItineraryResponse,
  ProgrammingBlockResponse,
  SetBlockBookingStatusRequest,
  SetBlockStatusRequest,
  SetPublishVisibilityRequest,
  StageZoneResponse,
  UpdateFestivalRequest,
  UpdateProgrammingBlockRequest,
  UpdateStageZoneRequest,
} from '@/types/generated-api';

export function festivalQueryKey(venueId: string, eventId: string) {
  return ['festival', venueId, eventId] as const;
}

export function stagesQueryKey(venueId: string, eventId: string) {
  return ['festival', venueId, eventId, 'stages'] as const;
}

export function useFestival(venueId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: festivalQueryKey(venueId, eventId),
    queryFn: () =>
      apiFetch<FestivalResponse>(`/venues/${venueId}/festivals/${eventId}`, {
        skipVenueContext: true,
      }),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

/**
 * Creates a festival, or converts an existing standard event when `existingEventId` is
 * supplied. Conversion keeps the same event record and its ledger.
 */
export function useCreateFestival(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFestivalRequest) =>
      apiFetch<FestivalResponse>(`/venues/${venueId}/festivals`, {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: (festival) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      if (festival.eventId) {
        void queryClient.invalidateQueries({
          queryKey: festivalQueryKey(venueId, festival.eventId),
        });
      }
    },
  });
}

export function useUpdateFestival(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateFestivalRequest) =>
      apiFetch<FestivalResponse>(`/venues/${venueId}/festivals/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: festivalQueryKey(venueId, eventId) });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useRevertFestivalToStandard(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/venues/${venueId}/festivals/${eventId}/revert-to-standard`, {
        method: 'POST',
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: festivalQueryKey(venueId, eventId) });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useStages(venueId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: stagesQueryKey(venueId, eventId),
    queryFn: () =>
      apiFetch<StageZoneResponse[]>(`/venues/${venueId}/festivals/${eventId}/stages`, {
        skipVenueContext: true,
      }),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useCreateStage(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStageZoneRequest) =>
      apiFetch<StageZoneResponse>(`/venues/${venueId}/festivals/${eventId}/stages`, {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => invalidateFestival(queryClient, venueId, eventId),
  });
}

export function useUpdateStage(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, ...body }: UpdateStageZoneRequest & { stageId: string }) =>
      apiFetch<StageZoneResponse>(`/venues/${venueId}/festivals/${eventId}/stages/${stageId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => invalidateFestival(queryClient, venueId, eventId),
  });
}

export function useDeleteStage(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) =>
      apiFetch<void>(`/venues/${venueId}/festivals/${eventId}/stages/${stageId}`, {
        method: 'DELETE',
        skipVenueContext: true,
      }),
    onSuccess: () => invalidateFestival(queryClient, venueId, eventId),
  });
}

function invalidateFestival(
  queryClient: ReturnType<typeof useQueryClient>,
  venueId: string,
  eventId: string,
) {
  void queryClient.invalidateQueries({ queryKey: stagesQueryKey(venueId, eventId) });
  void queryClient.invalidateQueries({ queryKey: festivalQueryKey(venueId, eventId) });
}

export function blocksQueryKey(venueId: string, eventId: string) {
  return ['festival', venueId, eventId, 'blocks'] as const;
}

export function artistsQueryKey(venueId: string, eventId: string) {
  return ['festival', venueId, eventId, 'artists'] as const;
}

export function artistAppearancesQueryKey(venueId: string, eventId: string, artistId: string) {
  return ['festival', venueId, eventId, 'artists', artistId, 'appearances'] as const;
}

function invalidateBlocks(
  queryClient: ReturnType<typeof useQueryClient>,
  venueId: string,
  eventId: string,
) {
  void queryClient.invalidateQueries({ queryKey: blocksQueryKey(venueId, eventId) });
  void queryClient.invalidateQueries({ queryKey: festivalQueryKey(venueId, eventId) });
  void queryClient.invalidateQueries({ queryKey: artistsQueryKey(venueId, eventId) });
  void queryClient.invalidateQueries({ queryKey: ['festival', venueId, eventId, 'itinerary'] });
}

export function useFestivalArtists(venueId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: artistsQueryKey(venueId, eventId),
    queryFn: () =>
      apiFetch<FestivalArtistResponse[]>(`/venues/${venueId}/festivals/${eventId}/artists`, {
        skipVenueContext: true,
      }),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useCreateFestivalArtist(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFestivalArtistRequest) =>
      apiFetch<FestivalArtistResponse>(`/venues/${venueId}/festivals/${eventId}/artists`, {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: artistsQueryKey(venueId, eventId) });
    },
  });
}

export function useArtistAppearances(
  venueId: string,
  eventId: string,
  artistId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: artistAppearancesQueryKey(venueId, eventId, artistId ?? ''),
    queryFn: () =>
      apiFetch<ArtistAppearanceDto[]>(
        `/venues/${venueId}/festivals/${eventId}/artists/${artistId}/appearances`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(artistId),
  });
}

export function useCopyDealTerms(venueId: string, eventId: string, artistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CopyDealTermsRequest) =>
      apiFetch<number>(
        `/venues/${venueId}/festivals/${eventId}/artists/${artistId}/copy-deal-terms`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => {
      invalidateBlocks(queryClient, venueId, eventId);
      void queryClient.invalidateQueries({
        queryKey: artistAppearancesQueryKey(venueId, eventId, artistId),
      });
    },
  });
}

export function useCreateBlock(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProgrammingBlockRequest) =>
      apiFetch<ProgrammingBlockResponse>(`/venues/${venueId}/festivals/${eventId}/blocks`, {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => invalidateBlocks(queryClient, venueId, eventId),
  });
}

export function useUpdateBlock(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, ...body }: UpdateProgrammingBlockRequest & { blockId: string }) =>
      apiFetch<ProgrammingBlockResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => invalidateBlocks(queryClient, venueId, eventId),
  });
}

export function useDeleteBlock(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      apiFetch<void>(`/venues/${venueId}/festivals/${eventId}/blocks/${blockId}`, {
        method: 'DELETE',
        skipVenueContext: true,
      }),
    onSuccess: () => invalidateBlocks(queryClient, venueId, eventId),
  });
}

export interface ItineraryQueryFilters {
  day?: string;
  stageZoneId?: string;
  category?: string;
  status?: string;
  view?: 'internal' | 'public';
}

export function itineraryQueryKey(
  venueId: string,
  eventId: string,
  filters: ItineraryQueryFilters = {},
) {
  return ['festival', venueId, eventId, 'itinerary', filters] as const;
}

export function blockHistoryQueryKey(venueId: string, eventId: string, blockId: string) {
  return ['festival', venueId, eventId, 'blocks', blockId, 'history'] as const;
}

function invalidateItinerary(
  queryClient: ReturnType<typeof useQueryClient>,
  venueId: string,
  eventId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['festival', venueId, eventId, 'itinerary'] });
  invalidateBlocks(queryClient, venueId, eventId);
}

export interface BlockPinMutationVariables {
  venueId: string;
  eventId: string;
  blockId: string;
}

function applyBlockPinOptimistic(
  queryClient: ReturnType<typeof useQueryClient>,
  venueId: string,
  eventId: string,
  blockId: string,
  pinned: boolean,
) {
  const previous = queryClient.getQueriesData<ItineraryResponse>({
    queryKey: ['festival', venueId, eventId, 'itinerary'],
  });
  queryClient.setQueriesData<ItineraryResponse>(
    { queryKey: ['festival', venueId, eventId, 'itinerary'] },
    (current) =>
      current
        ? {
            ...current,
            blocks: (current.blocks ?? []).map((block) =>
              block.id === blockId ? { ...block, isPinned: pinned } : block,
            ),
          }
        : current,
  );
  return previous;
}

export function usePinProgrammingBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, eventId, blockId }: BlockPinMutationVariables) =>
      apiFetch<void>(`/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/pin`, {
        method: 'PUT',
        skipVenueContext: true,
      }),
    onMutate: async ({ venueId, eventId, blockId }) => {
      await queryClient.cancelQueries({ queryKey: ['festival', venueId, eventId, 'itinerary'] });
      const previous = applyBlockPinOptimistic(queryClient, venueId, eventId, blockId, true);
      return { previous, venueId, eventId };
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _error, vars) => {
      if (!vars) {
        return;
      }
      invalidateItinerary(queryClient, vars.venueId, vars.eventId);
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(vars.venueId) });
    },
  });
}

export function useUnpinProgrammingBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, eventId, blockId }: BlockPinMutationVariables) =>
      apiFetch<void>(`/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/pin`, {
        method: 'DELETE',
        skipVenueContext: true,
      }),
    onMutate: async ({ venueId, eventId, blockId }) => {
      await queryClient.cancelQueries({ queryKey: ['festival', venueId, eventId, 'itinerary'] });
      const previous = applyBlockPinOptimistic(queryClient, venueId, eventId, blockId, false);
      return { previous, venueId, eventId };
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _error, vars) => {
      if (!vars) {
        return;
      }
      invalidateItinerary(queryClient, vars.venueId, vars.eventId);
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(vars.venueId) });
    },
  });
}

export function useItinerary(
  venueId: string,
  eventId: string,
  filters: ItineraryQueryFilters = {},
  enabled = true,
) {
  const params = new URLSearchParams();
  if (filters.day) {
    params.set('day', filters.day);
  }
  if (filters.stageZoneId) {
    params.set('stageZoneId', filters.stageZoneId);
  }
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.view === 'public') {
    params.set('view', 'public');
  }
  const query = params.toString();

  return useQuery({
    queryKey: itineraryQueryKey(venueId, eventId, filters),
    queryFn: () =>
      apiFetch<ItineraryResponse>(
        `/venues/${venueId}/festivals/${eventId}/itinerary${query ? `?${query}` : ''}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function usePublicItinerary(
  venueId: string,
  eventId: string,
  filters: Omit<ItineraryQueryFilters, 'view' | 'status'> = {},
  enabled = true,
) {
  return useItinerary(venueId, eventId, { ...filters, view: 'public' }, enabled);
}

export function useSetPublishVisibility(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetPublishVisibilityRequest) =>
      apiFetch<{ updated: number }>(
        `/venues/${venueId}/festivals/${eventId}/itinerary/publish-visibility`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => invalidateItinerary(queryClient, venueId, eventId),
  });
}

export function useBlockHistory(
  venueId: string,
  eventId: string,
  blockId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: blockHistoryQueryKey(venueId, eventId, blockId ?? ''),
    queryFn: () =>
      apiFetch<FestivalAuditEntryResponse[]>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/history`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(blockId),
  });
}

/** Promotes a held appearance to confirmed, or demotes it back to a hold. */
export function useSetBlockBookingStatus(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      blockId,
      ...body
    }: SetBlockBookingStatusRequest & { blockId: string }) =>
      apiFetch<ProgrammingBlockResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/booking-status`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: (_result, variables) => {
      invalidateItinerary(queryClient, venueId, eventId);
      void queryClient.invalidateQueries({
        queryKey: blockHistoryQueryKey(venueId, eventId, variables.blockId),
      });
    },
  });
}

export function useSetBlockStatus(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      blockId,
      ...body
    }: SetBlockStatusRequest & { blockId: string }) =>
      apiFetch<ProgrammingBlockResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/status`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: (_result, variables) => {
      invalidateItinerary(queryClient, venueId, eventId);
      void queryClient.invalidateQueries({
        queryKey: blockHistoryQueryKey(venueId, eventId, variables.blockId),
      });
    },
  });
}
