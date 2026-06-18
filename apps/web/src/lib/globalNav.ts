import type { AppPath } from '@/lib/appRoute';
import { getAppPath, isEventWorkspacePath, navigateToDashboard } from '@/lib/appRoute';

export type GlobalNavId = 'dashboard' | 'booking' | 'accounting';

export interface GlobalNavItemConfig {
  id: GlobalNavId;
  label: string;
  disabled?: boolean;
  navigate?: () => void;
  matchPaths: AppPath[];
}

export const GLOBAL_NAV_ITEMS: GlobalNavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    navigate: navigateToDashboard,
    matchPaths: ['/', '/venues/new'],
  },
  {
    id: 'booking',
    label: 'Booking Calendar',
    disabled: true,
    matchPaths: [],
  },
  {
    id: 'accounting',
    label: 'Settlements / Accounting Sync',
    disabled: true,
    matchPaths: [],
  },
];

export function matchesDashboardNavPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/venues/new') {
    return true;
  }
  return isEventWorkspacePath(pathname);
}

export function resolveActiveGlobalNavId(path: AppPath | string = getAppPath()): GlobalNavId | null {
  const pathname = String(path);
  if (pathname.startsWith('/settings')) {
    return null;
  }

  if (matchesDashboardNavPath(pathname)) {
    return 'dashboard';
  }

  for (const item of GLOBAL_NAV_ITEMS) {
    if (item.matchPaths.includes(pathname as AppPath)) {
      return item.id;
    }
  }

  return null;
}
