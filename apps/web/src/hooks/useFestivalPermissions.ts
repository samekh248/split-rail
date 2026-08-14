import { useUserProfile } from '@/api/user';

/** Gates every itinerary write: stages, programming blocks, and schedule status changes. */
export function useCanManageFestivalSchedule(): boolean {
  const { data: profile } = useUserProfile();
  return profile?.role?.permissions?.canManageFestivalSchedule ?? false;
}

/** Publishing a block to the public itinerary is a separate grant from editing the schedule. */
export function useCanPublishPublicItinerary(): boolean {
  const { data: profile } = useUserProfile();
  return profile?.role?.permissions?.canPublishPublicItinerary ?? false;
}
