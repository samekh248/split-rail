import { describe, expect, it } from 'vitest';
import {
  buildMonthCalendarWeeks,
  filterPlacementsByView,
  getMonthBounds,
  getUpcomingPlacementsBounds,
  groupPlacementsByDate,
  groupPlacementsByDateAndVenue,
  MAX_CALENDAR_QUERY_SPAN_DAYS,
  pickNextUpcomingPlacements,
  previewConflict,
  sortAgendaPlacements,
  sortPlacementsForList,
  type BookingPlacement,
  type CalendarViewContext,
} from '@/lib/bookingCalendar';

const VENUE_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const VENUE_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function placement(overrides: Partial<BookingPlacement> & Pick<BookingPlacement, 'eventId'>): BookingPlacement {
  return {
    venueId: VENUE_A,
    venueName: 'Venue A',
    regionId: null,
    regionName: null,
    title: 'Act',
    eventDate: '2026-06-15',
    bookingPlacementStatus: 'CONFIRMED',
    doorsTime: null,
    workspaceAllowed: true,
    ...overrides,
  };
}

describe('bookingCalendar', () => {
  it('getMonthBounds returns inclusive first and last day of month', () => {
    const bounds = getMonthBounds('2026-06');
    expect(bounds.from).toBe('2026-06-01');
    expect(bounds.to).toBe('2026-06-30');
  });

  it('getUpcomingPlacementsBounds starts the day after the selected month', () => {
    const bounds = getUpcomingPlacementsBounds('2026-06');
    expect(bounds.from).toBe('2026-07-01');
    expect(bounds.to > bounds.from).toBe(true);
  });

  it('getUpcomingPlacementsBounds stays within calendar API max span', () => {
    const bounds = getUpcomingPlacementsBounds('2026-06');
    const [fromYear, fromMonth, fromDay] = bounds.from.split('-').map(Number);
    const [toYear, toMonth, toDay] = bounds.to.split('-').map(Number);
    const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
    const toDate = new Date(toYear, toMonth - 1, toDay);
    const daySpan = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);

    expect(daySpan).toBeLessThanOrEqual(MAX_CALENDAR_QUERY_SPAN_DAYS);
  });

  it('pickNextUpcomingPlacements returns the next events after a month', () => {
    const upcoming = pickNextUpcomingPlacements(
      [
        placement({ eventId: 'e1', eventDate: '2026-06-30' }),
        placement({ eventId: 'e2', eventDate: '2026-07-05' }),
        placement({ eventId: 'e3', eventDate: '2026-07-12' }),
        placement({ eventId: 'e4', eventDate: '2026-08-01' }),
      ],
      '2026-06-30',
      3,
    );

    expect(upcoming.map((item) => item.eventId)).toEqual(['e2', 'e3', 'e4']);
  });

  it('groupPlacementsByDate sorts each day', () => {
    const grouped = groupPlacementsByDate([
      placement({ eventId: 'e2', eventDate: '2026-06-01', doorsTime: '20:00' }),
      placement({ eventId: 'e1', eventDate: '2026-06-01', doorsTime: '19:00' }),
    ]);
    expect(grouped['2026-06-01']?.map((p) => p.eventId)).toEqual(['e1', 'e2']);
  });

  it('buildMonthCalendarWeeks pads to full weeks', () => {
    const weeks = buildMonthCalendarWeeks('2026-06');
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks[0]?.days).toHaveLength(7);
    const inMonthDays = weeks.flatMap((week) => week.days).filter((day) => !day.isAdjacentMonth);
    expect(inMonthDays).toHaveLength(30);
  });

  it('groupPlacementsByDateAndVenue nests by date then venue', () => {
    const grouped = groupPlacementsByDateAndVenue([
      placement({ eventId: 'e1', eventDate: '2026-06-01', venueId: VENUE_A }),
      placement({ eventId: 'e2', eventDate: '2026-06-01', venueId: VENUE_B, venueName: 'Venue B' }),
      placement({ eventId: 'e3', eventDate: '2026-06-02' }),
    ]);

    expect(grouped['2026-06-01']?.[VENUE_A]).toHaveLength(1);
    expect(grouped['2026-06-01']?.[VENUE_B]).toHaveLength(1);
    expect(grouped['2026-06-02']?.[VENUE_A]).toHaveLength(1);
  });

  it('previewConflict mirrors server hold tier rules', () => {
    expect(previewConflict([], { type: 'createHold' })).toEqual({ allowed: true, tier: 'HOLD_1' });
    expect(
      previewConflict(
        [placement({ eventId: 'h1', bookingPlacementStatus: 'HOLD_1' })],
        { type: 'createHold' },
      ),
    ).toEqual({ allowed: true, tier: 'HOLD_2' });
    expect(
      previewConflict(
        [
          placement({ eventId: 'h1', bookingPlacementStatus: 'HOLD_1' }),
          placement({ eventId: 'h2', bookingPlacementStatus: 'HOLD_2' }),
        ],
        { type: 'createHold' },
      ),
    ).toEqual({ allowed: false, reason: expect.any(String) });
  });

  it('sortAgendaPlacements orders by doors time then venue name', () => {
    const sorted = sortAgendaPlacements([
      placement({ eventId: 'e2', venueName: 'Zebra', doorsTime: '20:00' }),
      placement({ eventId: 'e1', venueName: 'Alpha', doorsTime: '19:00' }),
      placement({ eventId: 'e3', venueName: 'Beta', doorsTime: null }),
    ]);

    expect(sorted.map((p) => p.eventId)).toEqual(['e1', 'e2', 'e3']);
  });

  it('sorts placements for list view by date then agenda order', () => {
    const sorted = sortPlacementsForList([
      placement({ eventId: 'e2', eventDate: '2026-08-02', doorsTime: '20:00' }),
      placement({ eventId: 'e1', eventDate: '2026-08-01' }),
      placement({ eventId: 'e3', eventDate: '2026-08-02', doorsTime: '18:00' }),
    ]);

    expect(sorted.map((p) => p.eventId)).toEqual(['e1', 'e3', 'e2']);
  });

  it('filters placements by view context client-side', () => {
    const context: CalendarViewContext = {
      viewMode: 'regional',
      regionId: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
      venueId: null,
      month: '2026-06',
      showCancelled: false,
      displayMode: 'calendar',
    };

    const placements = [
      placement({
        eventId: 'e1',
        regionId: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
        bookingPlacementStatus: 'CANCELLED',
      }),
      placement({
        eventId: 'e2',
        regionId: 'ssssssss-ssss-ssss-ssss-ssssssssssss',
      }),
    ];

    const filtered = filterPlacementsByView(placements, context);
    expect(filtered).toHaveLength(0);
  });
});
