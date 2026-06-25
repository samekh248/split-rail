import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { CreateRegionRequest, RegionResponse, UpdateRegionRequest } from '@/types/generated-api';

export function regionsQueryKey() {
  return ['regions'] as const;
}

export function useRegions() {
  return useQuery({
    queryKey: regionsQueryKey(),
    queryFn: () => apiFetch<RegionResponse[]>('/regions'),
    staleTime: 30_000,
  });
}

export function useCreateRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRegionRequest) =>
      apiFetch<RegionResponse>('/regions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: regionsQueryKey() }),
  });
}

export function useUpdateRegion(regionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRegionRequest) =>
      apiFetch<RegionResponse>(`/regions/${regionId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: regionsQueryKey() }),
  });
}

export function useDeleteRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (regionId: string) =>
      apiFetch<void>(`/regions/${regionId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: regionsQueryKey() }),
  });
}
