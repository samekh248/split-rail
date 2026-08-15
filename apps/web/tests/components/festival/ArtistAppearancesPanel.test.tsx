import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtistAppearancesPanel } from '@/components/festival/ArtistAppearancesPanel';

const artists = [
  { id: 'artist-1', name: 'Cody Jinks', appearanceCount: 2, bookingStatus: 'HOLD', confirmedAppearanceCount: 1 },
];

const appearances = [
  {
    blockId: 'block-1',
    title: 'Set A',
    dayDate: '2026-08-14',
    stageName: 'Main Stage',
    startTime: '20:00',
    endTime: '21:00',
    scheduleStatus: 'SCHEDULED',
    settlementStatus: 'DRAFT',
    bookingStatus: 'CONFIRMED',
  },
  {
    blockId: 'block-2',
    title: 'Set B',
    dayDate: '2026-08-15',
    stageName: 'Main Stage',
    startTime: '20:00',
    endTime: '21:00',
    scheduleStatus: 'SCHEDULED',
    settlementStatus: 'DRAFT',
    bookingStatus: 'HOLD',
  },
];

vi.mock('@/api/festivals', () => ({
  useFestivalArtists: () => ({ data: artists }),
  useArtistAppearances: () => ({ data: appearances, isLoading: false }),
  useCopyDealTerms: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ArtistAppearancesPanel', () => {
  it('shows the artist rollup and the booking status of each appearance', () => {
    render(
      <ArtistAppearancesPanel
        venueId="venue-1"
        eventId="event-1"
        artistId="artist-1"
        canManage
      />,
    );

    expect(screen.getByTestId('artist-booking-status')).toHaveTextContent('Hold');
    expect(screen.getByTestId('artist-booking-status')).toHaveClass(
      'festival-booking-status--hold',
    );

    expect(screen.getByTestId('appearance-booking-block-1')).toHaveTextContent('Confirmed');
    expect(screen.getByTestId('appearance-booking-block-1')).toHaveClass(
      'festival-booking-status--confirmed',
    );
    expect(screen.getByTestId('appearance-booking-block-2')).toHaveTextContent('Hold');
  });
});
