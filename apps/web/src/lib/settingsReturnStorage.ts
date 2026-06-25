import type { AppPath } from '@/lib/appRoute';
import { isEventWorkspacePath } from '@/lib/appRoute';

const STORAGE_KEY = 'split-rail:settings-return-path';

export type SettingsReturnPath = AppPath | string;

export function isSettingsPath(path: AppPath | string): boolean {
  return String(path).startsWith('/settings');
}

export function readSettingsReturnPath(): SettingsReturnPath {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return '/';
    }
    if (stored === '/venues/new' || stored === '/venues') {
      return stored;
    }
    if (stored === '/') {
      return '/';
    }
    if (isEventWorkspacePath(stored)) {
      return stored;
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

export function captureSettingsReturnPath(currentPath: AppPath | string): void {
  if (isSettingsPath(currentPath)) {
    return;
  }
  if (isEventWorkspacePath(String(currentPath))) {
    writeSettingsReturnPath(String(currentPath));
    return;
  }
  if (currentPath === '/venues/new' || currentPath === '/venues') {
    writeSettingsReturnPath(currentPath);
    return;
  }
  writeSettingsReturnPath('/');
}
