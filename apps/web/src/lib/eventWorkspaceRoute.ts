import { buildEventWorkspacePath, navigateToDashboard, pushPath } from '@/lib/appRoute';
import { setActiveEventId } from '@/venue/activeEventStorage';
import { setActiveVenueId } from '@/venue/activeVenueStorage';

export { navigateToDashboard };

export function navigateToEventWorkspace(
  venueId: string,
  eventId: string,
  focus?: string,
): void {
  setActiveVenueId(venueId);
  setActiveEventId(venueId, eventId);
  pushPath(buildEventWorkspacePath(venueId, eventId, focus));
}
