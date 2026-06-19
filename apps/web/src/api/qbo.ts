import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiFetch, ledgerPath } from './client';
import type {
  CreateMappingRequest,
  QboAccountMappingDto,
  QboAccountMappingsResponse,
  SyncResultDto,
  SyncStatusDto,
  VenueQboStatusDto,
  VenueSyncResultDto,
  UnmappedCountDto,
  UnmappedTransactionsResponse,
  UpdateMappingRequest,
} from '@/types/generated-api';

export const qboKeys = {
  all: ['qbo'] as const,
  syncStatus: (venueId: string, eventId: string) =>
    [...qboKeys.all, 'sync-status', venueId, eventId] as const,
  unmappedCount: (venueId: string, eventId: string) =>
    [...qboKeys.all, 'unmapped-count', venueId, eventId] as const,
  unmappedList: (venueId: string, eventId: string) =>
    [...qboKeys.all, 'unmapped-list', venueId, eventId] as const,
  mappings: (venueId: string) => [...qboKeys.all, 'mappings', venueId] as const,
  venueStatus: (venueId: string) => [...qboKeys.all, 'venue-status', venueId] as const,
};

export function useSyncStatus(
  venueId: string,
  eventId: string,
  options?: Omit<UseQueryOptions<SyncStatusDto>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.syncStatus(venueId, eventId),
    queryFn: () =>
      apiFetch<SyncStatusDto>(`${ledgerPath(venueId, eventId)}/sync-status`),
    enabled: Boolean(venueId && eventId),
    ...options,
  });
}

export function useUnmappedCount(
  venueId: string,
  eventId: string,
  options?: Omit<UseQueryOptions<UnmappedCountDto>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.unmappedCount(venueId, eventId),
    queryFn: () =>
      apiFetch<UnmappedCountDto>(`${ledgerPath(venueId, eventId)}/unmapped-count`),
    enabled: Boolean(venueId && eventId),
    refetchInterval: 30_000,
    ...options,
  });
}

export function useUnmappedTransactions(
  venueId: string,
  eventId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: qboKeys.unmappedList(venueId, eventId),
    queryFn: () =>
      apiFetch<UnmappedTransactionsResponse>(
        `${ledgerPath(venueId, eventId)}/unmapped-transactions`,
      ),
    enabled: enabled && Boolean(venueId && eventId),
  });
}

export function useVenueMappings(venueId: string) {
  return useQuery({
    queryKey: qboKeys.mappings(venueId),
    queryFn: () => apiFetch<QboAccountMappingsResponse>(`/venues/${venueId}/mappings`),
    enabled: Boolean(venueId),
  });
}

export function useVenueQboStatus(
  venueId: string,
  options?: Omit<UseQueryOptions<VenueQboStatusDto>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.venueStatus(venueId),
    queryFn: () => apiFetch<VenueQboStatusDto>(`/venues/${venueId}/qbo/status`),
    enabled: Boolean(venueId),
    ...options,
  });
}

export function useVenueSync(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<VenueSyncResultDto>(`/venues/${venueId}/sync`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.venueStatus(venueId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.all });
    },
  });
}

export function useTriggerSync(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SyncResultDto>(`${ledgerPath(venueId, eventId)}/sync`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.syncStatus(venueId, eventId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.unmappedCount(venueId, eventId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.unmappedList(venueId, eventId) });
    },
  });
}

export function useCreateMapping(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMappingRequest) =>
      apiFetch<QboAccountMappingDto>(`/venues/${venueId}/mappings`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.mappings(venueId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.unmappedCount(venueId, eventId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.unmappedList(venueId, eventId) });
    },
  });
}

export function useUpdateMapping(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mappingId, ...body }: UpdateMappingRequest & { mappingId: string }) =>
      apiFetch<QboAccountMappingDto>(`/venues/${venueId}/mappings/${mappingId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.mappings(venueId) });
    },
  });
}
