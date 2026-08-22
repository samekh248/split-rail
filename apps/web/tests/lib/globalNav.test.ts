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

  it('keeps dashboard active on the root route', () => {
    expect(resolveActiveGlobalNavId('/')).toBe('dashboard');
  });

  it('resolves booking as active on event and festival workspace routes', () => {
    expect(
      resolveActiveGlobalNavId(
        '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/events/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      ),
    ).toBe('booking');
    expect(
      resolveActiveGlobalNavId(
        '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/festivals/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/itinerary',
      ),
    ).toBe('booking');
    expect(
      resolveActiveGlobalNavId(
        '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/festivals/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/ledger',
      ),
    ).toBe('booking');
    expect(
      resolveActiveGlobalNavId(
        '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/festivals/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/reports',
      ),
    ).toBe('booking');
    expect(
      resolveActiveGlobalNavId(
        '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/festivals/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/blocks/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/settlement',
      ),
    ).toBe('booking');
  });

  it('resolves venues as active on /venues', () => {
    expect(resolveActiveGlobalNavId('/venues')).toBe('venues');
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
