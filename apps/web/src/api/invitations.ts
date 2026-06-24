import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  CreateInvitationRequest,
  InvitationResponse,
} from '@/types/generated-api';

export function useInvitations() {
  const canManageTeam = useCanManageTeam();

  return useQuery({
    queryKey: ['invitations'],
    queryFn: () => apiFetch<InvitationResponse[]>('/invitations', { skipVenueContext: true }),
    enabled: canManageTeam,
    staleTime: 30_000,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateInvitationRequest) =>
      apiFetch<InvitationResponse>('/invitations', {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<InvitationResponse>(`/invitations/${invitationId}/resend`, {
        method: 'POST',
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<void>(`/invitations/${invitationId}`, {
        method: 'DELETE',
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function acceptInvitation(body: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
  return apiFetch<AcceptInvitationResponse>('/invitations/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuthRecovery: true,
    skipVenueContext: true,
  });
}
