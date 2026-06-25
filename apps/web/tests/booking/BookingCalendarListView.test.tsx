import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingCalendarListView } from '@/components/booking/BookingCalendarListView';
import type { BookingPlacement } from '@/lib/bookingCalendar';

function placement(overrides: Partial<BookingPlacement> = {}): BookingPlacement {
  return {
    eventId: 'event-1',
    venueId: 'venue-1',
    venueName: 'Hall A',
    regionId: null,
    regionName: null,
    title: 'Headliner',
    eventDate: '2026-08-15',
    bookingPlacementStatus: 'CONFIRMED',
    doorsTime: '19:00',
    workspaceAllowed: true,
    ...overrides,
  };
}

describe('BookingCalendarListView', () => {
  it('renders empty state when there are no placements', () => {
    render(<BookingCalendarListView placements={[]} onPlacementClick={vi.fn()} />);

    expect(screen.getByTestId('booking-calendar-list')).toBeInTheDocument();
    expect(screen.getByText('No events this month.')).toBeInTheDocument();
  });

  it('renders placements sorted by date and calls click handler', () => {
    const onPlacementClick = vi.fn();
    const placements = [
      placement({ eventId: 'later', eventDate: '2026-08-20', title: 'Later Show' }),
      placement({ eventId: 'earlier', eventDate: '2026-08-10', title: 'Earlier Show' }),
    ];

    render(
      <BookingCalendarListView placements={placements} onPlacementClick={onPlacementClick} />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Earlier Show');
    expect(buttons[1]).toHaveTextContent('Later Show');

    fireEvent.click(screen.getByRole('button', { name: /Earlier Show/i }));
    expect(onPlacementClick).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'earlier' }),
    );
  });
});
