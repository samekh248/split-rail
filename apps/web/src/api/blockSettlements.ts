import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  ArtistSettlementRollupDto,
  BlockSettlementResultDto,
  BlockSettlementSheetResponse,
  BlockWorkQueueItemDto,
  FinalizeBlockSettlementRequest,
  FinalizePreflightResponse,
  ReopenBlockSettlementRequest,
} from '@/types/generated-api';

export function settlementSheetQueryKey(venueId: string, eventId: string, blockId: string) {
  return ['festival', venueId, eventId, 'settlement', blockId] as const;
}

export function settlementPreflightQueryKey(venueId: string, eventId: string, blockId: string) {
  return ['festival', venueId, eventId, 'settlement', blockId, 'preflight'] as const;
}

export function myBlocksQueryKey(venueId: string, eventId: string) {
  return ['festival', venueId, eventId, 'my-blocks'] as const;
}

export function artistRollupQueryKey(venueId: string, eventId: string, artistId: string) {
  return ['festival', venueId, eventId, 'artist-rollup', artistId] as const;
}

export function useBlockSettlementSheet(
  venueId: string,
  eventId: string,
  blockId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: settlementSheetQueryKey(venueId, eventId, blockId ?? ''),
    queryFn: () =>
      apiFetch<BlockSettlementSheetResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/settlement`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(blockId),
  });
}

export function useBlockSettlementPreflight(
  venueId: string,
  eventId: string,
  blockId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: settlementPreflightQueryKey(venueId, eventId, blockId ?? ''),
    queryFn: () =>
      apiFetch<FinalizePreflightResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/settlement/preflight`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(blockId),
  });
}

export function useMySettlementBlocks(venueId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: myBlocksQueryKey(venueId, eventId),
    queryFn: () =>
      apiFetch<BlockWorkQueueItemDto[]>(
        `/venues/${venueId}/festivals/${eventId}/my-blocks`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useArtistSettlementRollup(
  venueId: string,
  eventId: string,
  artistId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: artistRollupQueryKey(venueId, eventId, artistId ?? ''),
    queryFn: () =>
      apiFetch<ArtistSettlementRollupDto>(
        `/venues/${venueId}/festivals/${eventId}/artists/${artistId}/settlement-rollup`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(artistId),
  });
}

export function useFinalizeBlockSettlement(venueId: string, eventId: string, blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FinalizeBlockSettlementRequest) =>
      apiFetch<BlockSettlementResultDto>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/settlement/finalize`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: settlementSheetQueryKey(venueId, eventId, blockId),
      });
      void queryClient.invalidateQueries({
        queryKey: settlementPreflightQueryKey(venueId, eventId, blockId),
      });
      void queryClient.invalidateQueries({ queryKey: myBlocksQueryKey(venueId, eventId) });
    },
  });
}

export function useReopenBlockSettlement(venueId: string, eventId: string, blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReopenBlockSettlementRequest) =>
      apiFetch<BlockSettlementSheetResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/settlement/reopen`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: settlementSheetQueryKey(venueId, eventId, blockId),
      });
      void queryClient.invalidateQueries({
        queryKey: settlementPreflightQueryKey(venueId, eventId, blockId),
      });
    },
  });
}
