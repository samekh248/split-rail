import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  EventCardBadgeList,
  resolveFeaturedEventCardTag,
  type EventCardTag,
} from '@/components/dashboard/EventCardBadgeList';

const TAGS: EventCardTag[] = [
  {
    key: 'booking',
    label: 'Confirmed',
    testId: 'event-card-booking-test',
    className: 'event-card__booking-badge event-card__booking-badge--confirmed',
  },
  {
    key: 'alert',
    label: 'Missing signature',
    testId: 'event-card-alert-test',
    className: 'event-card__alert-chip badge-action-required',
  },
];

const FUTURE_DATE = '2099-06-15';
const PAST_DATE = '2020-01-15';

describe('resolveFeaturedEventCardTag', () => {
  it('uses booking status before the event occurs', () => {
    expect(resolveFeaturedEventCardTag(TAGS, FUTURE_DATE).key).toBe('booking');
  });

  it('uses the first action-required tag after the event occurs', () => {
    expect(resolveFeaturedEventCardTag(TAGS, PAST_DATE).key).toBe('alert');
  });
});

describe('EventCardBadgeList', () => {
  it('renders a single tag inline', () => {
    render(<EventCardBadgeList tags={[TAGS[0]]} eventId="evt-1" eventDate={FUTURE_DATE} />);
    expect(screen.getByTestId('event-card-booking-test')).toHaveTextContent('Confirmed');
    expect(screen.queryByTestId('event-card-badge-count-evt-1')).not.toBeInTheDocument();
  });

  it('shows booking status in the count badge before the event occurs', async () => {
    const user = userEvent.setup();
    render(<EventCardBadgeList tags={TAGS} eventId="evt-1" eventDate={FUTURE_DATE} />);

    const countBadge = screen.getByTestId('event-card-badge-count-evt-1');
    expect(countBadge).toHaveClass('event-card__badge-count--status');
    expect(screen.getByTestId('event-card-badge-featured-evt-1')).toHaveTextContent('Confirmed');
    expect(countBadge).toHaveTextContent('2');
    expect(screen.queryByTestId('event-card-booking-test')).not.toBeInTheDocument();

    await user.hover(countBadge);

    expect(screen.getByTestId('event-card-badge-popover-evt-1')).toBeInTheDocument();
    expect(screen.getByTestId('event-card-booking-test')).toHaveTextContent('Confirmed');
    expect(screen.getByTestId('event-card-alert-test')).toHaveTextContent('Missing signature');
  });

  it('shows the first action-required tag in the count badge after the event occurs', async () => {
    const user = userEvent.setup();
    render(<EventCardBadgeList tags={TAGS} eventId="evt-1" eventDate={PAST_DATE} />);

    const countBadge = screen.getByTestId('event-card-badge-count-evt-1');
    expect(countBadge).toHaveClass('event-card__badge-count--action');
    expect(screen.getByTestId('event-card-badge-featured-evt-1')).toHaveTextContent(
      'Missing signature',
    );
    expect(countBadge).toHaveTextContent('2');

    await user.hover(countBadge);
    expect(screen.getByTestId('event-card-alert-test')).toHaveTextContent('Missing signature');
  });
});
