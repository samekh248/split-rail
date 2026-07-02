import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventCardProgressBar } from '@/components/dashboard/EventCardProgressBar';
import { getMilestoneBarColor, getEventCardProgressFillGradient } from '@/lib/eventCardProgress';

const EVENT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const NOW = new Date(2026, 7, 15);

function futureDate(): string {
  return '2099-01-15';
}

function pastDate(): string {
  return '2020-01-15';
}

function todayDate(): string {
  return '2026-08-15';
}

describe('EventCardProgressBar', () => {
  it('renders progress bar with four milestone bubbles', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    expect(screen.getByTestId(`event-card-progress-${EVENT_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`event-card-progress-bubble-holds-${EVENT_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`event-card-progress-bubble-eventDate-${EVENT_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`event-card-progress-bubble-postEvent-${EVENT_ID}`)).toBeInTheDocument();
  });

  it('highlights confirmed milestone for upcoming confirmed events', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    expect(screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`)).toHaveClass(
      'event-card__progress-bubble--active',
    );
    expect(screen.getByTestId(`event-card-progress-bubble-holds-${EVENT_ID}`)).toHaveClass(
      'event-card__progress-bubble--completed',
    );
    expect(screen.getByTestId(`event-card-progress-bubble-holds-${EVENT_ID}`)).toHaveStyle({
      background: getMilestoneBarColor('holds'),
    });
    expect(screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`)).toHaveStyle({
      background: getMilestoneBarColor('confirmed'),
    });
  });

  it('sets fill width from active milestone', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    const bar = screen.getByTestId(`event-card-progress-${EVENT_ID}`);
    expect(bar).toHaveAttribute('aria-valuenow', '37.5');
    expect(bar.querySelector('.event-card__progress-fill')).toHaveStyle({ width: '37.5%' });
  });

  it('hides milestone labels until hover, focus, or tap', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={todayDate()}
        now={NOW}
      />,
    );

    expect(screen.queryByText('Event date')).not.toBeInTheDocument();
    expect(screen.queryByText('Post-event')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId(`event-card-progress-bubble-eventDate-${EVENT_ID}`));
    expect(screen.getByText('Event date')).toBeInTheDocument();
  });

  it('exposes accessible bar label for active milestone', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={pastDate()}
        now={NOW}
      />,
    );

    expect(screen.getByTestId(`event-card-progress-${EVENT_ID}`)).toHaveAttribute(
      'aria-label',
      'Event lifecycle: Post-event',
    );
  });

  it('de-emphasizes all bubbles when cancelled', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CANCELLED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    const root = screen.getByTestId(`event-card-progress-${EVENT_ID}`);
    expect(root).toHaveClass('event-card__progress--cancelled');
    expect(root).toHaveAttribute('aria-label', 'Cancelled booking — lifecycle progress inactive');
    expect(screen.getByTestId(`event-card-progress-bubble-holds-${EVENT_ID}`)).toHaveClass(
      'event-card__progress-bubble--cancelled',
    );
    expect(root.querySelector('.event-card__progress-fill')).toHaveStyle({ width: '0%' });
  });

  it('renders track rail and milestones inside the track', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="HOLD_1"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    const root = screen.getByTestId(`event-card-progress-${EVENT_ID}`);
    const track = root.querySelector('.event-card__progress-track');
    expect(track).toBeInTheDocument();
    expect(track?.querySelector('.event-card__progress-rail')).toBeInTheDocument();
    expect(track?.querySelector('.event-card__progress-fill')).toHaveClass('event-card__progress-fill');
    expect(track?.querySelector('.event-card__progress-milestones')).toBeInTheDocument();
  });

  it('uses brand-token gradient on the fill', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    const fill = screen.getByTestId(`event-card-progress-${EVENT_ID}`).querySelector(
      '.event-card__progress-fill',
    );
    expect(fill).toHaveStyle({ background: getEventCardProgressFillGradient() });
    expect(getEventCardProgressFillGradient()).toContain('var(--color-accent-orange)');
    expect(getEventCardProgressFillGradient()).toContain('var(--color-primary-brown)');
  });

  it('shows tooltip on bubble click', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    fireEvent.click(screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`));
    expect(
      screen.getByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).toHaveTextContent('Confirmed');
  });

  it('dismisses tooltip when clicking outside', () => {
    render(
      <div>
        <button type="button" data-testid="outside">Outside</button>
        <EventCardProgressBar
          eventId={EVENT_ID}
          bookingPlacementStatus="CONFIRMED"
          eventDate={futureDate()}
          now={NOW}
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`));
    expect(
      screen.getByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(
      screen.queryByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).not.toBeInTheDocument();
  });

  it('shows tooltip on hover and focus', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    const bubble = screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`);
    fireEvent.mouseEnter(bubble);
    expect(
      screen.getByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).toBeInTheDocument();

    fireEvent.mouseLeave(bubble);
    expect(
      screen.queryByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).not.toBeInTheDocument();

    fireEvent.focus(bubble);
    expect(
      screen.getByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).toBeInTheDocument();

    fireEvent.blur(bubble);
    expect(
      screen.queryByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).not.toBeInTheDocument();
  });

  it('toggles tooltip off when tapping the same bubble again', () => {
    render(
      <EventCardProgressBar
        eventId={EVENT_ID}
        bookingPlacementStatus="CONFIRMED"
        eventDate={futureDate()}
        now={NOW}
      />,
    );

    const bubble = screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_ID}`);
    fireEvent.click(bubble);
    expect(
      screen.getByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).toBeInTheDocument();
    fireEvent.click(bubble);
    expect(
      screen.queryByTestId(`event-card-progress-tooltip-confirmed-${EVENT_ID}`),
    ).not.toBeInTheDocument();
  });

  describe('compact layout', () => {
    it('uses compact sizing without inline labels', () => {
      render(
        <EventCardProgressBar
          eventId={EVENT_ID}
          bookingPlacementStatus="CONFIRMED"
          eventDate={futureDate()}
          compact
          now={NOW}
        />,
      );

      expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
      expect(screen.getByTestId(`event-card-progress-${EVENT_ID}`)).toHaveClass(
        'event-card__progress--compact',
      );
    });
  });
});
