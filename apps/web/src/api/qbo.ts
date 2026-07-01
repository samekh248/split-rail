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

/** Populated after OpenAPI regen from backend DTOs (spec 076). */
export type VenueQboIntegrationDto = {
  venueId: string;
  qboConnected: boolean;
  connectionState: 'Disconnected' | 'Connected' | 'Expired';
  companyName?: string | null;
  realmId?: string | null;
  lastSyncedAt?: string | null;
  canPurgeCache: boolean;
};

export type OrganizationQboSummaryDto = {
  organizationId: string;
  isQboConnected: boolean;
  connectedVenueCount: number;
  totalVenueCount: number;
};

export type QboConnectUrlDto = {
  authUrl: string;
};

export type QboTrackingRefDto = {
  type: string;
  id: string;
  name: string;
};

export type QboTrackingCatalogDto = {
  items: QboTrackingRefDto[];
};

export type QboTrackingMappingDto = {
  id: string;
  qboTrackingType: string;
  qboTrackingId: string;
  qboTrackingName: string;
  targetTier: string;
  targetEntityId: string;
  targetDisplayName?: string | null;
  createdAt: string;
};

export type QboTrackingMappingsResponse = {
  venueId: string;
  mappings: QboTrackingMappingDto[];
};

export type CreateTrackingMappingRequest = {
  qboTrackingType: string;
  qboTrackingId: string;
  qboTrackingName: string;
  targetTier: string;
  targetEntityId: string;
};

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
  integration: (venueId: string) => [...qboKeys.all, 'integration', venueId] as const,
  orgSummary: (orgId: string) => [...qboKeys.all, 'org-summary', orgId] as const,
  trackingCatalog: (venueId: string) => [...qboKeys.all, 'tracking-catalog', venueId] as const,
  trackingMappings: (venueId: string) => [...qboKeys.all, 'tracking-mappings', venueId] as const,
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

export function useVenueQboIntegration(
  venueId: string,
  options?: Omit<UseQueryOptions<VenueQboIntegrationDto>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.integration(venueId),
    queryFn: () =>
      apiFetch<VenueQboIntegrationDto>(`/venues/${venueId}/qbo/integration`),
    enabled: Boolean(venueId),
    staleTime: 30_000,
    ...options,
  });
}

export function useOrganizationQboSummary(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<OrganizationQboSummaryDto>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.orgSummary(organizationId ?? ''),
    queryFn: () =>
      apiFetch<OrganizationQboSummaryDto>(
        `/organizations/${organizationId}/qbo/summary`,
      ),
    enabled: Boolean(organizationId),
    staleTime: 30_000,
    ...options,
  });
}

export function useQboTrackingCatalog(
  venueId: string,
  enabled = true,
  options?: Omit<UseQueryOptions<QboTrackingCatalogDto>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.trackingCatalog(venueId),
    queryFn: () =>
      apiFetch<QboTrackingCatalogDto>(`/venues/${venueId}/qbo/tracking-catalog`),
    enabled: enabled && Boolean(venueId),
    staleTime: 15 * 60_000,
    ...options,
  });
}

export function useQboTrackingMappings(
  venueId: string,
  options?: Omit<UseQueryOptions<QboTrackingMappingsResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qboKeys.trackingMappings(venueId),
    queryFn: () =>
      apiFetch<QboTrackingMappingsResponse>(`/venues/${venueId}/qbo/tracking-mappings`),
    enabled: Boolean(venueId),
    ...options,
  });
}

export function useCreateTrackingMapping(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrackingMappingRequest) =>
      apiFetch<QboTrackingMappingDto>(`/venues/${venueId}/qbo/tracking-mappings`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.trackingMappings(venueId) });
    },
  });
}

export function useDeleteTrackingMapping(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) =>
      apiFetch<void>(`/venues/${venueId}/qbo/tracking-mappings/${mappingId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.trackingMappings(venueId) });
    },
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
      void queryClient.invalidateQueries({ queryKey: qboKeys.integration(venueId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.all });
    },
  });
}

export function useQboDisconnect(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/venues/${venueId}/qbo/disconnect`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.integration(venueId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.orgSummary('') });
      void queryClient.invalidateQueries({ queryKey: qboKeys.all });
    },
  });
}

export function useQboPurgeCache(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/venues/${venueId}/qbo/purge-cache`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qboKeys.integration(venueId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.all });
    },
  });
}

export async function fetchQboConnectUrl(venueId: string): Promise<string> {
  const result = await apiFetch<QboConnectUrlDto>(`/venues/${venueId}/qbo/connect-url`);
  return result.authUrl;
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
