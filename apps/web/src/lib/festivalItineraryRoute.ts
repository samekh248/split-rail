import {
  buildFestivalItineraryPath,
  navigateToDashboard,
  pushPath,
} from '@/lib/appRoute';
import { setActiveEventId } from '@/venue/activeEventStorage';
import { setActiveVenueId } from '@/venue/activeVenueStorage';

export { navigateToDashboard };

export function navigateToFestivalItinerary(venueId: string, eventId: string): void {
  setActiveVenueId(venueId);
  setActiveEventId(venueId, eventId);
  pushPath(buildFestivalItineraryPath(venueId, eventId));
}
