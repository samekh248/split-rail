import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  OrganizationResponse,
  UpdateOrganizationRequest,
} from '@/types/generated-api';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () =>
      apiFetch<OrganizationResponse[]>('/organizations', { skipVenueContext: true }),
    staleTime: 60_000,
  });
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOrganizationRequest) =>
      apiFetch<OrganizationResponse>(`/organizations/${organizationId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['organization', 'current'] });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) =>
      apiFetch<void>(`/organizations/${organizationId}`, {
        method: 'DELETE',
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
