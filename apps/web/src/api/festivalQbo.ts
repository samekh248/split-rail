import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  BlockQboSourceTraceResponse,
  FestivalQboTransactionResponse,
  QboReviewResolutionResponse,
  ResolveQboReviewRequest,
} from '@/types/generated-api';

export function festivalQboQueryKey(venueId: string, eventId: string, filters: Record<string, string> = {}) {
  return ['festival', venueId, eventId, 'qbo-transactions', filters] as const;
}

export function useFestivalQboTransactions(
  venueId: string,
  eventId: string,
  filters: { reviewState?: string; allocationState?: string } = {},
  enabled = true,
) {
  const params = new URLSearchParams();
  if (filters.reviewState) {
    params.set('reviewState', filters.reviewState);
  }
  if (filters.allocationState) {
    params.set('allocationState', filters.allocationState);
  }
  const query = params.toString();

  return useQuery({
    queryKey: festivalQboQueryKey(venueId, eventId, filters as Record<string, string>),
    queryFn: () =>
      apiFetch<FestivalQboTransactionResponse[]>(
        `/venues/${venueId}/festivals/${eventId}/qbo-transactions${query ? `?${query}` : ''}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useResolveQboReview(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, ...body }: ResolveQboReviewRequest & { transactionId: string }) =>
      apiFetch<QboReviewResolutionResponse>(
        `/venues/${venueId}/festivals/${eventId}/qbo-transactions/${transactionId}/review`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['festival', venueId, eventId, 'qbo-transactions'],
      });
    },
  });
}

export function useBlockQboSources(
  venueId: string,
  eventId: string,
  blockId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['festival', venueId, eventId, 'blocks', blockId, 'qbo-sources'],
    queryFn: () =>
      apiFetch<BlockQboSourceTraceResponse>(
        `/venues/${venueId}/festivals/${eventId}/blocks/${blockId}/qbo-sources`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(blockId),
  });
}
