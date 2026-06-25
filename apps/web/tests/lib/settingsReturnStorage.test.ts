import { beforeEach, describe, expect, it } from 'vitest';
import type { AppPath } from '@/lib/appRoute';
import {
  captureSettingsReturnPath,
  isSettingsPath,
  readSettingsReturnPath,
  writeSettingsReturnPath,
} from '@/lib/settingsReturnStorage';

describe('settingsReturnStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('isSettingsPath identifies settings routes', () => {
    const settingsPaths: AppPath[] = [
      '/settings',
      '/settings/team',
      '/settings/organization',
      '/settings/integrations',
    ];
    for (const path of settingsPaths) {
      expect(isSettingsPath(path)).toBe(true);
    }
    expect(isSettingsPath('/')).toBe(false);
    expect(isSettingsPath('/venues/new')).toBe(false);
  });

  it('captures dashboard return path when entering settings from app', () => {
    captureSettingsReturnPath('/');
    expect(readSettingsReturnPath()).toBe('/');
  });

  it('captures venues list return path when entering settings from app', () => {
    captureSettingsReturnPath('/venues');
    expect(readSettingsReturnPath()).toBe('/venues');
  });

  it('captures create-venue return path when entering settings from app', () => {
    captureSettingsReturnPath('/venues/new');
    expect(readSettingsReturnPath()).toBe('/venues/new');
  });

  it('does not overwrite return path when already in settings', () => {
    writeSettingsReturnPath('/venues/new');
    captureSettingsReturnPath('/settings/team');
    expect(readSettingsReturnPath()).toBe('/venues/new');
  });

  it('captures workspace return path when entering settings from app', () => {
    const workspacePath =
      '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/events/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    captureSettingsReturnPath(workspacePath);
    expect(readSettingsReturnPath()).toBe(workspacePath);
  });

  it('defaults to dashboard when no return path is stored', () => {
    expect(readSettingsReturnPath()).toBe('/');
  });
});
