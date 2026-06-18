const PINNED_EVENTS_KEY = 'pinnedEvents';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function storageKey(venueId: string, eventId: string): string {
  return `${venueId}:${eventId}`;
}

function readMap(): Record<string, true> {
  const raw = localStorage.getItem(PINNED_EVENTS_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, true>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, true>): void {
  localStorage.setItem(PINNED_EVENTS_KEY, JSON.stringify(map));
}

export function isEventPinned(venueId: string, eventId: string): boolean {
  if (!isValidUuid(venueId) || !isValidUuid(eventId)) {
    return false;
  }
  return readMap()[storageKey(venueId, eventId)] === true;
}

export function setEventPinned(venueId: string, eventId: string, pinned: boolean): void {
  if (!isValidUuid(venueId) || !isValidUuid(eventId)) {
    return;
  }
  const map = readMap();
  const key = storageKey(venueId, eventId);
  if (pinned) {
    map[key] = true;
  } else {
    delete map[key];
  }
  writeMap(map);
}

export function toggleEventPinned(venueId: string, eventId: string): boolean {
  const next = !isEventPinned(venueId, eventId);
  setEventPinned(venueId, eventId, next);
  return next;
}

export function clearAllPinnedEvents(): void {
  localStorage.removeItem(PINNED_EVENTS_KEY);
}
