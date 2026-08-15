import { FestivalItineraryPage } from '@/pages/FestivalItineraryPage';
import {
  useCanManageFestivalSchedule,
  useCanPublishPublicItinerary,
} from '@/hooks/useFestivalPermissions';

export interface FestivalItineraryRouteProps {
  venueId: string;
  eventId: string;
}

export function FestivalItineraryRoute({ venueId, eventId }: FestivalItineraryRouteProps) {
  const canManage = useCanManageFestivalSchedule();
  const canPublish = useCanPublishPublicItinerary();

  return (
    <FestivalItineraryPage
      venueId={venueId}
      eventId={eventId}
      canManage={canManage}
      canPublish={canPublish}
    />
  );
}
