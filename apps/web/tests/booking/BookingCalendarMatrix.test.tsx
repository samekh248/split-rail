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

  it('opens create event when quick-add is clicked on an empty day', async () => {
    const onCellQuickAdd = vi.fn();

    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={{}}
        onDateClick={vi.fn()}
        onPlacementClick={vi.fn()}
        onCellQuickAdd={onCellQuickAdd}
      />,
    );

    await userEvent.click(screen.getByTestId('booking-cell-quick-add-2026-06-15'));
    expect(onCellQuickAdd).toHaveBeenCalledWith('2026-06-15');
  });

  it('shows quick-add at the bottom of days that already have events', async () => {
    const date = '2026-06-10';
    const onCellQuickAdd = vi.fn();

    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={{ [date]: [makePlacement('e1', date, 'Act One')] }}
        onDateClick={vi.fn()}
        onPlacementClick={vi.fn()}
        onCellQuickAdd={onCellQuickAdd}
      />,
    );

    expect(screen.getByTestId(`booking-cell-quick-add-${date}`)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId(`booking-cell-quick-add-${date}`));
    expect(onCellQuickAdd).toHaveBeenCalledWith(date);
  });

  it('renders a multi-day festival as one spanning bar', () => {
    const festival: BookingPlacement = {
      ...makePlacement('fest', '2026-06-15', 'Summer Fest'),
      endDate: '2026-06-17',
      eventType: 'FESTIVAL',
    };

    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={{
          '2026-06-15': [festival],
          '2026-06-16': [festival],
          '2026-06-17': [festival],
        }}
        onDateClick={vi.fn()}
        onPlacementClick={vi.fn()}
      />,
    );

    const span = screen.getByTestId('booking-calendar-span-fest-2026-06-15');
    expect(span).toHaveAttribute('data-span-days', '3');
    expect(span).toHaveClass('booking-calendar-matrix__event--span');
    expect(screen.getAllByText('Summer Fest')).toHaveLength(1);
  });

  it('continues a weekend-wrapping festival on the next week', () => {
    const festival: BookingPlacement = {
      ...makePlacement('fest', '2026-06-19', 'Weekend Fest'),
      endDate: '2026-06-21',
      eventType: 'FESTIVAL',
    };

    render(
      <BookingCalendarMatrix
        month="2026-06"
        placementsByDate={{
          '2026-06-19': [festival],
          '2026-06-20': [festival],
          '2026-06-21': [festival],
        }}
        onDateClick={vi.fn()}
        onPlacementClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId('booking-calendar-span-fest-2026-06-19')).toHaveAttribute(
      'data-span-days',
      '2',
    );
    expect(screen.getByTestId('booking-calendar-span-fest-2026-06-21')).toHaveAttribute(
      'data-span-days',
      '1',
    );
    expect(screen.getByTestId('booking-calendar-span-fest-2026-06-19')).toHaveClass(
      'booking-calendar-matrix__event--continues-after',
    );
    expect(screen.getByTestId('booking-calendar-span-fest-2026-06-21')).toHaveClass(
      'booking-calendar-matrix__event--continues-before',
    );
  });
});
