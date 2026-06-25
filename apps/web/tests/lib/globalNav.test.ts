import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAppPath,
  navigateToAccounting,
  navigateToBooking,
} from '@/lib/appRoute';
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

  it('navigateToBooking pushes /booking', () => {
    navigateToBooking();
    expect(getAppPath()).toBe('/booking');
  });

  it('resolves booking nav on /booking', () => {
    expect(resolveActiveGlobalNavId('/booking')).toBe('booking');
  });

  it('enables booking nav item with /booking match path', () => {
    const booking = GLOBAL_NAV_ITEMS.find((item) => item.id === 'booking');
    expect(booking?.disabled).toBeUndefined();
    expect(booking?.matchPaths).toContain('/booking');
    expect(booking?.navigate).toBeTypeOf('function');
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
