import type { AppPath } from '@/lib/appRoute';
import { getAppPath, navigateToDashboard } from '@/lib/appRoute';

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

export function resolveActiveGlobalNavId(path: AppPath = getAppPath()): GlobalNavId | null {
  if (path.startsWith('/settings')) {
    return null;
  }

  for (const item of GLOBAL_NAV_ITEMS) {
    if (item.matchPaths.includes(path)) {
      return item.id;
    }
  }

  return null;
}
