import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  CreateExpenseAllocationRequest,
  CreateRevenueAllocationRequest,
  CreateRevenueBucketRequest,
  ExpenseAllocationResponse,
  ExpenseSourceSummaryResponse,
  RevenueAllocationResponse,
  RevenueBucketResponse,
  UpdateRevenueAllocationRequest,
  UpdateRevenueBucketRequest,
} from '@/types/generated-api';

export function bucketsQueryKey(venueId: string, eventId: string) {
  return ['festival', venueId, eventId, 'buckets'] as const;
}

export function allocationsQueryKey(venueId: string, eventId: string, bucketId: string) {
  return ['festival', venueId, eventId, 'buckets', bucketId, 'allocations'] as const;
}

export function expenseSummaryQueryKey(venueId: string, eventId: string, sourceLineItemId: string) {
  return ['festival', venueId, eventId, 'expense-summary', sourceLineItemId] as const;
}

export function useRevenueBuckets(venueId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: bucketsQueryKey(venueId, eventId),
    queryFn: () =>
      apiFetch<RevenueBucketResponse[]>(
        `/venues/${venueId}/festivals/${eventId}/buckets`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useCreateRevenueBucket(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRevenueBucketRequest) =>
      apiFetch<RevenueBucketResponse>(`/venues/${venueId}/festivals/${eventId}/buckets`, {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bucketsQueryKey(venueId, eventId) });
    },
  });
}

export function useUpdateRevenueBucket(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bucketId, body }: { bucketId: string; body: UpdateRevenueBucketRequest }) =>
      apiFetch<RevenueBucketResponse>(
        `/venues/${venueId}/festivals/${eventId}/buckets/${bucketId}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bucketsQueryKey(venueId, eventId) });
    },
  });
}

export function useBucketAllocations(
  venueId: string,
  eventId: string,
  bucketId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: allocationsQueryKey(venueId, eventId, bucketId ?? ''),
    queryFn: () =>
      apiFetch<RevenueAllocationResponse[]>(
        `/venues/${venueId}/festivals/${eventId}/buckets/${bucketId}/allocations`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(bucketId),
  });
}

export function useCreateRevenueAllocation(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRevenueAllocationRequest) =>
      apiFetch<RevenueAllocationResponse>(
        `/venues/${venueId}/festivals/${eventId}/allocations`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: bucketsQueryKey(venueId, eventId) });
      if (result.revenueBucketId) {
        void queryClient.invalidateQueries({
          queryKey: allocationsQueryKey(venueId, eventId, result.revenueBucketId),
        });
      }
    },
  });
}

export function useUpdateRevenueAllocation(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      allocationId,
      body,
    }: {
      allocationId: string;
      body: UpdateRevenueAllocationRequest;
    }) =>
      apiFetch<RevenueAllocationResponse>(
        `/venues/${venueId}/festivals/${eventId}/allocations/${allocationId}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: bucketsQueryKey(venueId, eventId) });
      if (result.revenueBucketId) {
        void queryClient.invalidateQueries({
          queryKey: allocationsQueryKey(venueId, eventId, result.revenueBucketId),
        });
      }
    },
  });
}

export function useExpenseSourceSummary(
  venueId: string,
  eventId: string,
  sourceLineItemId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: expenseSummaryQueryKey(venueId, eventId, sourceLineItemId ?? ''),
    queryFn: () =>
      apiFetch<ExpenseSourceSummaryResponse>(
        `/venues/${venueId}/festivals/${eventId}/expense-allocations/summary?sourceLineItemId=${sourceLineItemId}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId) && Boolean(sourceLineItemId),
  });
}

export function useCreateExpenseAllocation(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExpenseAllocationRequest) =>
      apiFetch<ExpenseAllocationResponse>(
        `/venues/${venueId}/festivals/${eventId}/expense-allocations`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipVenueContext: true,
        },
      ),
    onSuccess: (_result, variables) => {
      if (variables.sourceLineItemId) {
        void queryClient.invalidateQueries({
          queryKey: expenseSummaryQueryKey(venueId, eventId, variables.sourceLineItemId),
        });
      }
    },
  });
}
