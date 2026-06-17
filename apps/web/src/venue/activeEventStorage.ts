const ACTIVE_EVENTS_KEY = 'activeEventByVenue';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function readMap(): Record<string, string> {
  const raw = sessionStorage.getItem(ACTIVE_EVENTS_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>): void {
  sessionStorage.setItem(ACTIVE_EVENTS_KEY, JSON.stringify(map));
}

export function getActiveEventId(venueId: string): string | null {
  if (!isValidUuid(venueId)) {
    return null;
  }
  const eventId = readMap()[venueId];
  if (!eventId || !isValidUuid(eventId)) {
    return null;
  }
  return eventId;
}

export function setActiveEventId(venueId: string, eventId: string): void {
  if (!isValidUuid(venueId) || !isValidUuid(eventId)) {
    return;
  }
  const map = readMap();
  map[venueId] = eventId;
  writeMap(map);
}

export function clearActiveEventId(venueId: string): void {
  if (!isValidUuid(venueId)) {
    return;
  }
  const map = readMap();
  delete map[venueId];
  writeMap(map);
}

export function clearAllActiveEvents(): void {
  sessionStorage.removeItem(ACTIVE_EVENTS_KEY);
}
