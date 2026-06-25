import { describe, expect, it } from 'vitest';
import {
  buildMonthCalendarWeeks,
  filterPlacementsByView,
  getMonthBounds,
  groupPlacementsByDate,
  groupPlacementsByDateAndVenue,
  previewConflict,
  sortAgendaPlacements,
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

  it('filters placements by view context client-side', () => {
    const context: CalendarViewContext = {
      viewMode: 'regional',
      regionId: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
      venueId: null,
      month: '2026-06',
      showCancelled: false,
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
