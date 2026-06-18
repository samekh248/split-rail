import { beforeEach, describe, expect, it } from 'vitest';
import {
  filterTonightEvents,
  getPinnedEvents,
  partitionOverviewZones,
  partitionRecentEvents,
  partitionUpcomingEvents,
} from '@/lib/partitionOverviewZones';
import { setEventPinned, clearAllPinnedEvents, isEventPinned } from '@/lib/pinnedEventStorage';
import { EVENT_A } from '../fixtures/events';
import type { EventResponse } from '@/types/generated-api';
import { VENUE_A } from '../fixtures/venues';

const REF_NOW = new Date(2026, 5, 18, 12, 0, 0);

function event(id: string, eventDate: string, overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    eventId: id,
    venueId: VENUE_A.id,
    title: `Event ${id.slice(0, 4)}`,
    eventDate,
    status: 'PRE_SHOW',
    isBudgetLocked: false,
    qboTagName: '',
    ...overrides,
  };
}

describe('partitionOverviewZones', () => {
  beforeEach(() => {
    clearAllPinnedEvents();
  });

  it('classifies today, recent, upcoming, and out-of-range events', () => {
    const events = [
      event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-18'),
      event('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-06-17'),
      event('cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-06-11'),
      event('dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-06-10'),
      event('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-06-19'),
      event('ffffffff-ffff-ffff-ffff-ffffffffffff', '2026-07-18'),
      event('11111111-1111-1111-1111-111111111111', '2026-07-19'),
    ];

    const partition = partitionOverviewZones(events, VENUE_A.id, REF_NOW);

    expect(partition.tonight.map((e) => e.eventId)).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ]);
    expect(partition.recent.map((e) => e.eventId)).toEqual([
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    ]);
    expect(partition.upcoming.map((e) => e.eventId)).toEqual([
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ]);
    expect(partition.pinned).toEqual([]);
  });

  it('excludes today from recent and upcoming', () => {
    const today = event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-18');
    expect(partitionRecentEvents([today], REF_NOW)).toEqual([]);
    expect(partitionUpcomingEvents([today], REF_NOW)).toEqual([]);
  });

  it('includes boundary dates at 7 days ago and 30 days ahead', () => {
    const sevenDaysAgo = event('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-06-11');
    const thirtyAhead = event('cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-07-18');

    expect(partitionRecentEvents([sevenDaysAgo], REF_NOW).map((e) => e.eventId)).toEqual([
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    ]);
    expect(partitionUpcomingEvents([thirtyAhead], REF_NOW).map((e) => e.eventId)).toEqual([
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    ]);
  });

  it('includes pinned events in pinned zone and matching date zones', () => {
    const pinnedUpcoming = event('dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-06-19');
    setEventPinned(VENUE_A.id, pinnedUpcoming.eventId!, true);
    expect(isEventPinned(VENUE_A.id, pinnedUpcoming.eventId!)).toBe(true);

    const partition = partitionOverviewZones([pinnedUpcoming], VENUE_A.id, REF_NOW);

    expect(getPinnedEvents([pinnedUpcoming], VENUE_A.id).map((e) => e.eventId)).toEqual([
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    ]);
    expect(partition.pinned.map((e) => e.eventId)).toEqual(['dddddddd-dddd-dddd-dddd-dddddddddddd']);
    expect(partition.upcoming.map((e) => e.eventId)).toEqual(['dddddddd-dddd-dddd-dddd-dddddddddddd']);
  });

  it('sorts recent descending and upcoming ascending', () => {
    const older = event('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-06-15');
    const newer = event('cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-06-17');
    const sooner = event('dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-06-20');
    const later = event('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-06-25');

    expect(partitionRecentEvents([older, newer], REF_NOW).map((e) => e.eventId)).toEqual([
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    ]);
    expect(partitionUpcomingEvents([later, sooner], REF_NOW).map((e) => e.eventId)).toEqual([
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    ]);
  });

  it('sorts tonight events by event date when all share the same lifecycle phase', () => {
    const first = event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-18', {
      status: 'PRE_SHOW',
      isBudgetLocked: false,
    });
    const second = event('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-06-18', {
      status: 'PRE_SHOW',
      isBudgetLocked: true,
    });

    const tonight = filterTonightEvents([second, first], REF_NOW);
    expect(tonight).toHaveLength(2);
    expect(tonight.every((e) => e.eventDate === '2026-06-18')).toBe(true);
  });

  it('excludes invalid dates from date zones but keeps pinned', () => {
    const invalid = event(EVENT_A.eventId!, 'invalid');
    setEventPinned(VENUE_A.id, invalid.eventId!, true);
    expect(isEventPinned(VENUE_A.id, invalid.eventId!)).toBe(true);

    const partition = partitionOverviewZones([invalid], VENUE_A.id, REF_NOW);

    expect(partition.tonight).toEqual([]);
    expect(partition.recent).toEqual([]);
    expect(partition.upcoming).toEqual([]);
    expect(partition.pinned.map((e) => e.eventId)).toEqual([EVENT_A.eventId]);
  });
});
