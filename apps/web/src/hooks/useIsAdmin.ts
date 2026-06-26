import { useUserProfile } from '@/api/user';

export function useIsAdmin(): boolean {
  const { data } = useUserProfile();
  return data?.role?.roleName === 'Admin';
}
