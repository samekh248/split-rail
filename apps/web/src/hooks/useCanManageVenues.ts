import { useUserProfile } from '@/api/user';

export function useCanManageVenues(): boolean {
  const { data } = useUserProfile();
  return data?.role?.permissions?.canManagePermissions ?? false;
}
