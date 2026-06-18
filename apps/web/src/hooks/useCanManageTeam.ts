import { useUserProfile } from '@/api/user';

export function useCanManageTeam(): boolean {
  const { data } = useUserProfile();
  return data?.role?.permissions?.canManagePermissions ?? false;
}
