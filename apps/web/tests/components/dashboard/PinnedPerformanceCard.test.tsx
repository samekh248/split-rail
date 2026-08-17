import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PinnedPerformanceCard } from '@/components/dashboard/PinnedPerformanceCard';
import { navigateToFestivalItinerary } from '@/lib/festivalItineraryRoute';
import type { PinnedPerformanceDto } from '@/types/generated-api';

vi.mock('@/lib/festivalItineraryRoute', () => ({
  navigateToFestivalItinerary: vi.fn(),
}));

const performance: PinnedPerformanceDto = {
  blockId: 'block-1',
  eventId: 'event-1',
  venueId: 'venue-1',
  festivalTitle: 'Red Dirt Fest',
  title: 'Cody Jinks',
  dayDate: '2026-08-14',
  startTime: '20:00',
  endTime: '21:30',
  stageName: 'Main Stage',
  isPinned: true,
};

describe('PinnedPerformanceCard', () => {
  it('shows festival, time, and itinerary link for a pinned performance', () => {
    const onPinToggle = vi.fn();
    const onActivate = vi.fn();
    render(
      <PinnedPerformanceCard
        performance={performance}
        onPinToggle={onPinToggle}
        onActivate={onActivate}
      />,
    );

    expect(screen.getByTestId('pinned-performance-block-1')).toHaveTextContent('Cody Jinks');
    expect(screen.getByTestId('pinned-performance-festival-block-1')).toHaveTextContent('Red Dirt Fest');
    expect(screen.getByTestId('pinned-performance-when-block-1')).toHaveTextContent('20:00–21:30');
    expect(screen.getByTestId('pinned-performance-when-block-1')).toHaveTextContent('Main Stage');

    fireEvent.click(screen.getByTestId('pinned-performance-pin-block-1'));
    expect(onPinToggle).toHaveBeenCalledWith('venue-1', 'event-1', 'block-1', true);
    expect(onActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('pinned-performance-itinerary-block-1'));
    expect(navigateToFestivalItinerary).toHaveBeenCalledWith('venue-1', 'event-1');
  });
});
