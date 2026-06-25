import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppPath, navigateToAccounting } from '@/lib/appRoute';
import {
  GLOBAL_NAV_ITEMS,
  navigateToAccountingWithVenueScope,
  resolveActiveGlobalNavId,
} from '@/lib/globalNav';

describe('globalNav', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('resolves accounting as active on /accounting', () => {
    expect(resolveActiveGlobalNavId('/accounting')).toBe('accounting');
  });

  it('keeps dashboard active on root and workspace routes', () => {
    expect(resolveActiveGlobalNavId('/')).toBe('dashboard');
    expect(
      resolveActiveGlobalNavId(
        '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/events/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      ),
    ).toBe('dashboard');
  });

  it('resolves venues as active on /venues and /venues/new', () => {
    expect(resolveActiveGlobalNavId('/venues')).toBe('venues');
    expect(resolveActiveGlobalNavId('/venues/new')).toBe('venues');
    expect(resolveActiveGlobalNavId('/venues/new')).not.toBe('dashboard');
  });

  it('returns null on settings routes', () => {
    expect(resolveActiveGlobalNavId('/settings/team')).toBeNull();
  });

  it('enables accounting nav item with /accounting match path', () => {
    const accounting = GLOBAL_NAV_ITEMS.find((item) => item.id === 'accounting');
    expect(accounting?.disabled).toBeUndefined();
    expect(accounting?.matchPaths).toContain('/accounting');
    expect(accounting?.navigate).toBeTypeOf('function');
  });

  it('navigateToAccounting pushes /accounting', () => {
    navigateToAccounting();
    expect(getAppPath()).toBe('/accounting');
  });

  it('navigateToAccountingWithVenueScope exits all-venues before navigating', () => {
    const activateVenueId = vi.fn();
    navigateToAccountingWithVenueScope(
      true,
      [{ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }],
      activateVenueId,
    );
    expect(activateVenueId).toHaveBeenCalledWith('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    expect(getAppPath()).toBe('/accounting');
  });
});
