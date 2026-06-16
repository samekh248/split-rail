import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { UserProfileResponse } from '@/types/generated-api';

export function fetchUserProfile(): Promise<UserProfileResponse> {
  return apiFetch<UserProfileResponse>('/users/me');
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: fetchUserProfile,
    staleTime: 60_000,
  });
}

export function useCanTriggerQboSync(): boolean {
  const { data } = useUserProfile();
  return data?.role?.permissions?.canTriggerQboSync ?? false;
}

export function useCanSignSettlement(): boolean {
  const { data } = useUserProfile();
  return data?.role?.permissions?.canSignSettlement ?? false;
}
