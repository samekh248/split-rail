import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BookingCalendarLegend } from '@/components/booking/BookingCalendarLegend';

describe('BookingCalendarLegend', () => {
  it('shows booked, hold 1, and hold 2 by default', () => {
    render(<BookingCalendarLegend />);

    expect(screen.getByTestId('booking-calendar-legend')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Hold 1')).toBeInTheDocument();
    expect(screen.getByText('Hold 2')).toBeInTheDocument();
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
  });

  it('includes cancelled when showCancelled is enabled', () => {
    render(<BookingCalendarLegend showCancelled />);

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('calls onHighlightStatus when hovering a legend item', async () => {
    const user = userEvent.setup();
    const onHighlightStatus = vi.fn();

    render(<BookingCalendarLegend onHighlightStatus={onHighlightStatus} />);

    await user.hover(screen.getByTestId('booking-calendar-legend-HOLD_1'));

    expect(onHighlightStatus).toHaveBeenCalledWith('HOLD_1');
  });

  it('clears highlight when pointer leaves the legend', async () => {
    const user = userEvent.setup();
    const onHighlightStatus = vi.fn();

    render(
      <div>
        <BookingCalendarLegend onHighlightStatus={onHighlightStatus} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.hover(screen.getByTestId('booking-calendar-legend-CONFIRMED'));
    await user.hover(screen.getByRole('button', { name: 'Outside' }));

    expect(onHighlightStatus).toHaveBeenLastCalledWith(null);
  });
});