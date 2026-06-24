import type { EventResponse } from '@/types/generated-api';
import { getActiveEventId, setActiveEventId } from '@/venue/activeEventStorage';

export function filterEvents(events: EventResponse[], query: string): EventResponse[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return events;
  }
  return events.filter((event) => {
    const title = (event.title ?? '').toLowerCase();
    const date = (event.eventDate ?? '').toLowerCase();
    return title.includes(normalized) || date.includes(normalized);
  });
}

export function resolveActiveEventId(
  events: EventResponse[],
  venueId: string,
): string | null {
  if (events.length === 0) {
    return null;
  }

  const remembered = getActiveEventId(venueId);
  if (remembered && events.some((event) => event.eventId === remembered)) {
    return remembered;
  }

  const defaultId = events[0]?.eventId ?? null;
  if (defaultId) {
    setActiveEventId(venueId, defaultId);
  }
  return defaultId;
}
