import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearActiveEventId,
  clearAllActiveEvents,
  getActiveEventId,
  setActiveEventId,
} from '@/venue/activeEventStorage';

const VENUE_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const VENUE_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EVENT_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('activeEventStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when no event is stored for venue', () => {
    expect(getActiveEventId(VENUE_A)).toBeNull();
  });

  it('persists event id per venue', () => {
    setActiveEventId(VENUE_A, EVENT_A);
    expect(getActiveEventId(VENUE_A)).toBe(EVENT_A);
    expect(getActiveEventId(VENUE_B)).toBeNull();
  });

  it('clears event id for a venue', () => {
    setActiveEventId(VENUE_A, EVENT_A);
    clearActiveEventId(VENUE_A);
    expect(getActiveEventId(VENUE_A)).toBeNull();
  });

  it('ignores invalid uuids', () => {
    setActiveEventId('bad', EVENT_A);
    expect(getActiveEventId('bad')).toBeNull();
  });

  it('clears all active events', () => {
    setActiveEventId(VENUE_A, EVENT_A);
    clearAllActiveEvents();
    expect(getActiveEventId(VENUE_A)).toBeNull();
  });
});
