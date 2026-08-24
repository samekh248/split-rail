import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventDetailsCard } from '@/components/event/EventDetailsCard';
import type { EventResponse } from '@/types/generated-api';

const event: EventResponse = {
  eventId: '11111111-1111-1111-1111-111111111111',
  venueId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Waylon Wyatt',
  eventDate: '2026-09-14',
  status: 'PRE_SHOW',
  bookingPlacementStatus: 'CONFIRMED',
  doorsTime: '19:00',
  showStartTime: '20:00',
  supportLineup: 'Openers',
  notes: 'A note',
};

describe('EventDetailsCard', () => {
  it('shows schedule, lineup, notes, and booking status', () => {
    render(<EventDetailsCard event={event} />);

    expect(screen.getByTestId('event-details-status')).toHaveTextContent('Confirmed');
    expect(screen.getByText('Doors: 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Show start: 8:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Openers')).toBeInTheDocument();
    expect(screen.getByText('A note')).toBeInTheDocument();
  });

  it('communicates empty show details in words', () => {
    render(
      <EventDetailsCard
        event={{ ...event, doorsTime: null, showStartTime: null, supportLineup: null, notes: null }}
      />,
    );

    expect(screen.getByText('No schedule times set.')).toBeInTheDocument();
    expect(screen.getByText('No supporting lineup set.')).toBeInTheDocument();
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('hides show start time while the placement is on hold', () => {
    render(<EventDetailsCard event={{ ...event, bookingPlacementStatus: 'HOLD_1' }} />);

    expect(screen.getByText('Doors: 7:00 PM')).toBeInTheDocument();
    expect(screen.queryByText(/Show start:/)).not.toBeInTheDocument();
  });
});
