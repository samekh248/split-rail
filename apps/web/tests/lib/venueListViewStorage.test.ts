import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVenuesPageViewCookies,
  readVenuesPageDisplayMode,
  readVenuesPageRegionFilter,
  writeVenuesPageDisplayMode,
  writeVenuesPageRegionFilter,
} from '@/lib/venueListViewStorage';

describe('venueListViewStorage', () => {
  beforeEach(() => {
    clearVenuesPageViewCookies();
  });

  it('returns null when no region filter cookie is set', () => {
    expect(readVenuesPageRegionFilter()).toBeNull();
  });

  it('persists region filter in a cookie', () => {
    writeVenuesPageRegionFilter('region-a');
    expect(readVenuesPageRegionFilter()).toBe('region-a');
  });

  it('persists all and unassigned filter values', () => {
    writeVenuesPageRegionFilter('all');
    expect(readVenuesPageRegionFilter()).toBe('all');
    writeVenuesPageRegionFilter('unassigned');
    expect(readVenuesPageRegionFilter()).toBe('unassigned');
  });

  it('returns null when no display mode cookie is set', () => {
    expect(readVenuesPageDisplayMode()).toBeNull();
  });

  it('persists flat and grouped display modes', () => {
    writeVenuesPageDisplayMode('flat');
    expect(readVenuesPageDisplayMode()).toBe('flat');
    writeVenuesPageDisplayMode('grouped');
    expect(readVenuesPageDisplayMode()).toBe('grouped');
  });

  it('ignores invalid cookie values', () => {
    document.cookie = 'venuesPageDisplayMode=grid; Path=/; SameSite=Lax';
    expect(readVenuesPageDisplayMode()).toBeNull();
  });
});
