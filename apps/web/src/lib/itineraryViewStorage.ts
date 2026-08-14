export type ItineraryViewMode = 'internal' | 'public';

const STORAGE_KEY = 'festivalItineraryViewMode';

export function readItineraryViewMode(): ItineraryViewMode {
  if (typeof window === 'undefined') {
    return 'internal';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'public' ? 'public' : 'internal';
}

export function writeItineraryViewMode(mode: ItineraryViewMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function clearItineraryViewMode(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
