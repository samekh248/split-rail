import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearActiveVenueId,
  getActiveVenueId,
  setActiveVenueId,
} from '@/venue/activeVenueStorage';

const VALID_ID = '11111111-1111-1111-1111-111111111111';

describe('activeVenueStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored (C1.1)', () => {
    expect(getActiveVenueId()).toBeNull();
  });

  it('persists and reads a venue id (C1.2)', () => {
    setActiveVenueId(VALID_ID);
    expect(getActiveVenueId()).toBe(VALID_ID);
    expect(sessionStorage.getItem('activeVenueId')).toBe(VALID_ID);
  });

  it('clears the stored venue id (C1.3)', () => {
    setActiveVenueId(VALID_ID);
    clearActiveVenueId();
    expect(getActiveVenueId()).toBeNull();
    expect(sessionStorage.getItem('activeVenueId')).toBeNull();
  });

  it('treats malformed stored values as absent (C1.4)', () => {
    sessionStorage.setItem('activeVenueId', '');
    expect(getActiveVenueId()).toBeNull();

    sessionStorage.setItem('activeVenueId', 'not-a-uuid');
    expect(getActiveVenueId()).toBeNull();
  });

  it('uses sessionStorage not localStorage (C1.5)', () => {
    setActiveVenueId(VALID_ID);
    expect(localStorage.getItem('activeVenueId')).toBeNull();
    expect(sessionStorage.getItem('activeVenueId')).toBe(VALID_ID);
  });
});
