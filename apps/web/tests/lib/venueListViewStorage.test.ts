import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVenuesPageViewCookies,
  readVenuesPageRegionFilter,
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
});
