import { useEffect } from 'react';
import { useUserProfile } from '@/api/user';
import { setDateDisplayFormat } from '@/lib/dateDisplayFormat';

/** Keeps shared date formatters aligned with the signed-in user's preference. */
export function DateDisplayFormatSync() {
  const { data: profile } = useUserProfile();

  useEffect(() => {
    setDateDisplayFormat(profile?.dateDisplayFormat);
  }, [profile?.dateDisplayFormat]);

  return null;
}
