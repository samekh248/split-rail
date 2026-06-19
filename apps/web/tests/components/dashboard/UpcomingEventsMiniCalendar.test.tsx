import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpcomingEventsMiniCalendar } from '@/components/dashboard/UpcomingEventsMiniCalendar';
import type { EventCardDto } from '@/types/generated-api';

const REF_NOW = new Date(2026, 5, 18, 12, 0, 0);
const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function event(id: string, eventDate: string, title: string): EventCardDto {
  return { eventId: id, venueId: VENUE_ID, title, eventDate };
}

describe('UpcomingEventsMiniCalendar', () => {
  it('places events on matching calendar day cells', () => {
    render(
      <UpcomingEventsMiniCalendar
        events={[event('11111111-1111-1111-1111-111111111111', '2026-06-20', 'Friday Show')]}
        onEventActivate={vi.fn()}
        now={REF_NOW}
      />,
    );

    expect(screen.getByTestId('calendar-day-2026-06-20')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-event-11111111-1111-1111-1111-111111111111')).toHaveTextContent(
      'Friday Show',
    );
  });

  it('shows three titles and +N more for busy dates', () => {
    const events = [
      event('11111111-1111-1111-1111-111111111111', '2026-06-20', 'Show One'),
      event('22222222-2222-2222-2222-222222222222', '2026-06-20', 'Show Two'),
      event('33333333-3333-3333-3333-333333333333', '2026-06-20', 'Show Three'),
      event('44444444-4444-4444-4444-444444444444', '2026-06-20', 'Show Four'),
    ];

    render(
      <UpcomingEventsMiniCalendar events={events} onEventActivate={vi.fn()} now={REF_NOW} />,
    );

    expect(screen.getByTestId('calendar-more-2026-06-20')).toHaveTextContent('+1 more');
    fireEvent.click(screen.getByTestId('calendar-more-2026-06-20'));
    expect(screen.getByTestId('calendar-popover-2026-06-20')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-event-44444444-4444-4444-4444-444444444444')).toBeInTheDocument();
  });

  it('includes adjacent-month padding days in the grid', () => {
    render(
      <UpcomingEventsMiniCalendar
        events={[event('11111111-1111-1111-1111-111111111111', '2026-07-18', 'Late Window')]}
        onEventActivate={vi.fn()}
        now={REF_NOW}
      />,
    );

    const julyCell = screen.getByTestId('calendar-day-2026-07-18');
    expect(julyCell).toHaveAttribute('data-adjacent-month', 'true');
    expect(julyCell).toHaveAttribute('data-in-window', 'true');
  });

  it('activates workspace navigation for event chips', () => {
    const onEventActivate = vi.fn();

    render(
      <UpcomingEventsMiniCalendar
        events={[event('11111111-1111-1111-1111-111111111111', '2026-06-20', 'Nav Show')]}
        onEventActivate={onEventActivate}
        now={REF_NOW}
      />,
    );

    fireEvent.click(screen.getByTestId('calendar-event-11111111-1111-1111-1111-111111111111'));
    expect(onEventActivate).toHaveBeenCalledWith(
      VENUE_ID,
      '11111111-1111-1111-1111-111111111111',
    );
  });

  it('activates hidden events from +N more popover', () => {
    const onEventActivate = vi.fn();
    const events = [
      event('11111111-1111-1111-1111-111111111111', '2026-06-20', 'Show One'),
      event('22222222-2222-2222-2222-222222222222', '2026-06-20', 'Show Two'),
      event('33333333-3333-3333-3333-333333333333', '2026-06-20', 'Show Three'),
      event('44444444-4444-4444-4444-444444444444', '2026-06-20', 'Show Four'),
    ];

    render(
      <UpcomingEventsMiniCalendar events={events} onEventActivate={onEventActivate} now={REF_NOW} />,
    );

    fireEvent.click(screen.getByTestId('calendar-more-2026-06-20'));
    fireEvent.click(screen.getByTestId('calendar-event-44444444-4444-4444-4444-444444444444'));
    expect(onEventActivate).toHaveBeenCalledWith(
      VENUE_ID,
      '44444444-4444-4444-4444-444444444444',
    );
  });

  it('ignores clicks when venue or event id is missing', () => {
    const onEventActivate = vi.fn();

    render(
      <UpcomingEventsMiniCalendar
        events={[{ eventId: undefined, venueId: undefined, title: 'Broken', eventDate: '2026-06-20' }]}
        onEventActivate={onEventActivate}
        now={REF_NOW}
      />,
    );

    expect(screen.queryByTestId('calendar-event-undefined')).not.toBeInTheDocument();
    expect(onEventActivate).not.toHaveBeenCalled();
  });
});
