const STORAGE_KEY = 'split-rail:sidebar-pinned';

export function readSidebarPinnedExpanded(): boolean {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value === 'false') {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function writeSidebarPinnedExpanded(pinnedExpanded: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, pinnedExpanded ? 'true' : 'false');
  } catch {
    // ignore storage failures
  }
}
