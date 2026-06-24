import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import type { RoleResponse } from '@/types/generated-api';

export function useRoles() {
  const canManageTeam = useCanManageTeam();

  return useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch<RoleResponse[]>('/roles', { skipVenueContext: true }),
    enabled: canManageTeam,
    staleTime: 60_000,
  });
}
