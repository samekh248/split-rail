import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navigateToFestivalItinerary } from '@/lib/festivalItineraryRoute';
import { navigateToFestivalLedger } from '@/lib/festivalLedgerRoute';
import { pushPath } from '@/lib/appRoute';
import { setActiveEventId } from '@/venue/activeEventStorage';
import { setActiveVenueId } from '@/venue/activeVenueStorage';

vi.mock('@/lib/appRoute', () => ({
  pushPath: vi.fn(),
  buildFestivalItineraryPath: (venueId: string, eventId: string) =>
    `/venues/${venueId}/festivals/${eventId}/itinerary`,
  buildFestivalLedgerPath: (venueId: string, eventId: string) =>
    `/venues/${venueId}/festivals/${eventId}/ledger`,
  navigateToDashboard: vi.fn(),
}));

vi.mock('@/venue/activeVenueStorage', () => ({
  setActiveVenueId: vi.fn(),
}));

vi.mock('@/venue/activeEventStorage', () => ({
  setActiveEventId: vi.fn(),
}));

describe('festival route helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigateToFestivalItinerary sets context and pushes itinerary path', () => {
    navigateToFestivalItinerary('venue-1', 'event-1');

    expect(setActiveVenueId).toHaveBeenCalledWith('venue-1');
    expect(setActiveEventId).toHaveBeenCalledWith('venue-1', 'event-1');
    expect(pushPath).toHaveBeenCalledWith('/venues/venue-1/festivals/event-1/itinerary');
  });

  it('navigateToFestivalLedger sets context and pushes ledger path', () => {
    navigateToFestivalLedger('venue-1', 'event-1');

    expect(setActiveVenueId).toHaveBeenCalledWith('venue-1');
    expect(setActiveEventId).toHaveBeenCalledWith('venue-1', 'event-1');
    expect(pushPath).toHaveBeenCalledWith('/venues/venue-1/festivals/event-1/ledger');
  });
});
