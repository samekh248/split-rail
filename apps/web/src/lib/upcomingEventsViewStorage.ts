export type UpcomingViewMode = 'list' | 'calendar';

const STORAGE_KEY = 'split-rail:upcoming-events-view';

function isUpcomingViewMode(value: string | null): value is UpcomingViewMode {
  return value === 'list' || value === 'calendar';
}

export function readUpcomingViewMode(): UpcomingViewMode {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (isUpcomingViewMode(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return 'list';
}

export function writeUpcomingViewMode(mode: UpcomingViewMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}
