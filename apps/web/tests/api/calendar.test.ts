import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  buildCalendarPlacementFromEvent,
  calendarPlacementsQueryKey,
  upsertCalendarPlacementInCache,
} from '@/api/calendar';
import type { EventResponse, VenueResponse } from '@/types/generated-api';

const VENUE: VenueResponse = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
};

const CREATED_EVENT: EventResponse = {
  eventId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  venueId: VENUE.id,
  title: 'New Show',
  eventDate: '2026-06-15',
  status: 'PRE_SHOW',
  bookingPlacementStatus: 'CONFIRMED',
  isBudgetLocked: false,
  qboTagName: '',
  workspaceAllowed: true,
};

describe('calendar cache helpers', () => {
  it('upserts a created placement into the active month query cache', () => {
    const queryClient = new QueryClient();
    const params = { from: '2026-06-01', to: '2026-06-30', includeCancelled: false };
    queryClient.setQueryData(calendarPlacementsQueryKey(params), []);

    upsertCalendarPlacementInCache(
      queryClient,
      buildCalendarPlacementFromEvent(CREATED_EVENT, VENUE),
    );

    expect(queryClient.getQueryData(calendarPlacementsQueryKey(params))).toEqual([
      expect.objectContaining({
        eventId: CREATED_EVENT.eventId,
        title: 'New Show',
        eventDate: '2026-06-15',
        venueName: 'Hall A',
      }),
    ]);
  });

  it('does not upsert placements outside the cached month range', () => {
    const queryClient = new QueryClient();
    const params = { from: '2026-07-01', to: '2026-07-31', includeCancelled: false };
    queryClient.setQueryData(calendarPlacementsQueryKey(params), []);

    upsertCalendarPlacementInCache(
      queryClient,
      buildCalendarPlacementFromEvent(CREATED_EVENT, VENUE),
    );

    expect(queryClient.getQueryData(calendarPlacementsQueryKey(params))).toEqual([]);
  });
});
