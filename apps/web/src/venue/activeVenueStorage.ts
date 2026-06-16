const ACTIVE_VENUE_KEY = 'activeVenueId';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function getActiveVenueId(): string | null {
  const raw = sessionStorage.getItem(ACTIVE_VENUE_KEY);
  if (!raw || !isValidUuid(raw)) {
    return null;
  }
  return raw;
}

export function setActiveVenueId(id: string): void {
  sessionStorage.setItem(ACTIVE_VENUE_KEY, id);
}

export function clearActiveVenueId(): void {
  sessionStorage.removeItem(ACTIVE_VENUE_KEY);
}
