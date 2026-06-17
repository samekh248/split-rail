import { useUserProfile } from '@/api/user';

export function useCanManageEvents(): boolean {
  const { data } = useUserProfile();
  return data?.role?.permissions?.canViewFinancials ?? false;
}
