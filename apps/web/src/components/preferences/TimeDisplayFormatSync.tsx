import { useEffect } from 'react';
import { useUserProfile } from '@/api/user';
import { setTimeDisplayFormat } from '@/lib/timeDisplayFormat';

/** Keeps shared time formatters aligned with the signed-in user's preference. */
export function TimeDisplayFormatSync() {
  const { data: profile } = useUserProfile();

  useEffect(() => {
    setTimeDisplayFormat(profile?.timeDisplayFormat);
  }, [profile?.timeDisplayFormat]);

  return null;
}
