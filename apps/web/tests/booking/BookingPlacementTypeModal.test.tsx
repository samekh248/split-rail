import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingPlacementTypeModal } from '@/components/booking/BookingPlacementTypeModal';

describe('BookingPlacementTypeModal', () => {
  it('renders event and hold choices for the selected date', () => {
    render(
      <BookingPlacementTypeModal
        open
        dateKey="2026-06-15"
        onClose={vi.fn()}
        onSelectEvent={vi.fn()}
        onSelectHold={vi.fn()}
      />,
    );

    expect(screen.getByTestId('booking-placement-type-modal')).toBeInTheDocument();
    expect(screen.getByText(/June 15, 2026/i)).toBeInTheDocument();
    expect(screen.getByTestId('booking-placement-type-event')).toBeInTheDocument();
    expect(screen.getByTestId('booking-placement-type-hold')).toBeInTheDocument();
  });

  it('calls the selected placement handler', () => {
    const onSelectEvent = vi.fn();
    const onSelectHold = vi.fn();

    render(
      <BookingPlacementTypeModal
        open
        dateKey="2026-06-15"
        onClose={vi.fn()}
        onSelectEvent={onSelectEvent}
        onSelectHold={onSelectHold}
      />,
    );

    fireEvent.click(screen.getByTestId('booking-placement-type-event'));
    expect(onSelectEvent).toHaveBeenCalled();
    expect(onSelectHold).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('booking-placement-type-hold'));
    expect(onSelectHold).toHaveBeenCalled();
  });
});
