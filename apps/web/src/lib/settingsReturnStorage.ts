import type { AppPath, DashboardPath } from '@/lib/appRoute';

const STORAGE_KEY = 'split-rail:settings-return-path';

export type SettingsReturnPath = DashboardPath;

export function isSettingsPath(path: AppPath): boolean {
  return path.startsWith('/settings');
}

export function readSettingsReturnPath(): SettingsReturnPath {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === '/venues/new') {
      return '/venues/new';
    }
    if (stored === '/') {
      return '/';
    }
  } catch {
    // ignore storage errors
  }
  return '/';
}

export function writeSettingsReturnPath(path: SettingsReturnPath): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // ignore storage errors
  }
}

export function captureSettingsReturnPath(currentPath: AppPath): void {
  if (isSettingsPath(currentPath)) {
    return;
  }
  writeSettingsReturnPath(currentPath === '/venues/new' ? '/venues/new' : '/');
}
