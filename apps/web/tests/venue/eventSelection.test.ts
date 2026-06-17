import { beforeEach, describe, expect, it } from 'vitest';
import {
  canDeleteEvent,
  canEditEvent,
  filterEvents,
  resolveActiveEventId,
} from '@/venue/eventSelection';
import type { EventResponse } from '@/types/generated-api';
import { setActiveEventId } from '@/venue/activeEventStorage';

const VENUE_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const EVENTS: EventResponse[] = [
  {
    eventId: EVENT_A,
    title: 'Summer Show',
    eventDate: '2026-08-01',
    status: 'PRE_SHOW',
    isBudgetLocked: false,
  },
  {
    eventId: EVENT_B,
    title: 'Fall Festival',
    eventDate: '2026-09-15',
    status: 'SETTLED',
    isBudgetLocked: true,
  },
];

describe('eventSelection', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('filters events by title and date', () => {
    expect(filterEvents(EVENTS, 'summer')).toHaveLength(1);
    expect(filterEvents(EVENTS, '2026-09')).toHaveLength(1);
    expect(filterEvents(EVENTS, 'none')).toHaveLength(0);
  });

  it('resolves remembered event when valid', () => {
    setActiveEventId(VENUE_A, EVENT_B);
    expect(resolveActiveEventId(EVENTS, VENUE_A)).toBe(EVENT_B);
  });

  it('defaults to first event when no valid memory', () => {
    expect(resolveActiveEventId(EVENTS, VENUE_A)).toBe(EVENT_A);
  });

  it('returns null for empty list', () => {
    expect(resolveActiveEventId([], VENUE_A)).toBeNull();
  });

  it('gates edit and delete by lifecycle', () => {
    expect(canEditEvent(EVENTS[0]!)).toBe(true);
    expect(canDeleteEvent(EVENTS[0]!)).toBe(true);
    expect(canEditEvent(EVENTS[1]!)).toBe(false);
    expect(canDeleteEvent(EVENTS[1]!)).toBe(false);
  });

  it('blocks delete when budget locked in planning', () => {
    expect(
      canDeleteEvent({
        eventId: EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
      }),
    ).toBe(false);
  });
});
