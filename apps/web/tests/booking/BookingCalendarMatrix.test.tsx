import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  BookingCalendarMatrix,
  MAX_VISIBLE_PLACEMENTS_PER_DAY,
} from '@/components/booking/BookingCalendarMatrix';
import type { BookingPlacement } from '@/lib/bookingCalendar';

function makePlacement(id: string, date: string, title: string): BookingPlacement {
  return {
    eventId: id,
    venueId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    venueName: 'Hall A',
    regionId: null,
    regionName: null,
    title,
    eventDate: date,
    bookingPlacementStatus: 'CONFIRMED',
    doorsTime: null,
    workspaceAllowed: true,
  };
}

describe('BookingCalendarMatrix', () => {
  it('renders month grid with weekday headers', () => {
    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={{}}
        onDateClick={vi.fn()}
        onPlacementClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId('booking-calendar-matrix')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByTestId('booking-calendar-day-2026-06-15')).toBeInTheDocument();
  });

  it('shows up to two events and total count when more exist', () => {
    const date = '2026-06-10';
    const placementsByDate = {
      [date]: [
        makePlacement('e1', date, 'Act One'),
        makePlacement('e2', date, 'Act Two'),
        makePlacement('e3', date, 'Act Three'),
        makePlacement('e4', date, 'Act Four'),
        makePlacement('e5', date, 'Act Five'),
      ],
    };

    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={placementsByDate}
        onDateClick={vi.fn()}
        onPlacementClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Act One')).toBeInTheDocument();
    expect(screen.getByText('Act Two')).toBeInTheDocument();
    expect(screen.queryByText('Act Three')).not.toBeInTheDocument();
    expect(screen.getByTestId(`booking-cell-total-${date}`)).toHaveTextContent('5');
    expect(MAX_VISIBLE_PLACEMENTS_PER_DAY).toBe(2);
  });

  it('opens agenda when total count badge is clicked', async () => {
    const date = '2026-06-12';
    const onDateClick = vi.fn();
    const placementsByDate = {
      [date]: [
        makePlacement('e1', date, 'One'),
        makePlacement('e2', date, 'Two'),
        makePlacement('e3', date, 'Three'),
      ],
    };

    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={placementsByDate}
        onDateClick={onDateClick}
        onPlacementClick={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByTestId(`booking-cell-total-${date}`));
    expect(onDateClick).toHaveBeenCalledWith(date);
  });
});
