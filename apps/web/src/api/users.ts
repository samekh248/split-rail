import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import type {
  ChangeRoleRequest,
  ChangeRoleResponse,
  UpdateVenueScopesRequest,
  UpdateVenueScopesResponse,
  UserListResponse,
} from '@/types/generated-api';

export function useOrgMembers() {
  const canManageTeam = useCanManageTeam();

  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserListResponse[]>('/users', { skipVenueContext: true }),
    enabled: canManageTeam,
    staleTime: 30_000,
  });
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: ChangeRoleRequest }) =>
      apiFetch<ChangeRoleResponse>(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateMemberVenueScopes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateVenueScopesRequest }) =>
      apiFetch<UpdateVenueScopesResponse>(`/users/${userId}/venue-scopes`, {
        method: 'PUT',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>(`/users/${userId}`, {
        method: 'DELETE',
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
