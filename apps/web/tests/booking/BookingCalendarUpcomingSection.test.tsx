import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingCalendarUpcomingSection } from '@/components/booking/BookingCalendarUpcomingSection';
import type { BookingPlacement } from '@/lib/bookingCalendar';

function placement(overrides: Partial<BookingPlacement> = {}): BookingPlacement {
  return {
    eventId: 'event-1',
    venueId: 'venue-1',
    venueName: 'Hall A',
    regionId: null,
    regionName: null,
    title: 'Headliner',
    eventDate: '2026-07-15',
    bookingPlacementStatus: 'CONFIRMED',
    doorsTime: '19:00',
    workspaceAllowed: true,
    ...overrides,
  };
}

describe('BookingCalendarUpcomingSection', () => {
  it('renders empty state when there are no upcoming placements', () => {
    render(
      <BookingCalendarUpcomingSection
        month="2026-06"
        placements={[]}
        onPlacementClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId('booking-calendar-upcoming')).toBeInTheDocument();
    expect(screen.getByText('Upcoming after June 2026')).toBeInTheDocument();
    expect(screen.getByText('No upcoming events after this month.')).toBeInTheDocument();
  });

  it('renders up to three upcoming placement cards', () => {
    const onPlacementClick = vi.fn();
    const placements = [
      placement({ eventId: 'e1', title: 'Show One' }),
      placement({ eventId: 'e2', title: 'Show Two' }),
    ];

    render(
      <BookingCalendarUpcomingSection
        month="2026-06"
        placements={placements}
        onPlacementClick={onPlacementClick}
      />,
    );

    expect(screen.getByText('Show One')).toBeInTheDocument();
    expect(screen.getByText('Show Two')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show One/i }));
    expect(onPlacementClick).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1' }));
  });
});
