import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllPinnedEvents,
  isEventPinned,
  setEventPinned,
  toggleEventPinned,
} from '@/lib/pinnedEventStorage';
import { EVENT_A } from '../fixtures/events';

describe('pinnedEventStorage', () => {
  beforeEach(() => {
    clearAllPinnedEvents();
  });

  it('starts unpinned', () => {
    expect(isEventPinned(EVENT_A.venueId!, EVENT_A.eventId!)).toBe(false);
  });

  it('persists pin state in localStorage', () => {
    setEventPinned(EVENT_A.venueId!, EVENT_A.eventId!, true);
    expect(isEventPinned(EVENT_A.venueId!, EVENT_A.eventId!)).toBe(true);
  });

  it('toggles pin state', () => {
    expect(toggleEventPinned(EVENT_A.venueId!, EVENT_A.eventId!)).toBe(true);
    expect(toggleEventPinned(EVENT_A.venueId!, EVENT_A.eventId!)).toBe(false);
  });

  it('ignores invalid uuids', () => {
    setEventPinned('bad', EVENT_A.eventId!, true);
    expect(isEventPinned('bad', EVENT_A.eventId!)).toBe(false);
  });
});
