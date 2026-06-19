import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpcomingEventsSection } from '@/components/dashboard/DashboardZoneSections';
import type { EventCardDto, PermissionsDto } from '@/types/generated-api';

const PERMISSIONS: PermissionsDto = { canViewFinancials: true };
const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function upcomingEvent(id: string, title: string, daysFromNow = 1): EventCardDto {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { eventId: id, venueId: VENUE_ID, title, eventDate: iso };
}

const zoneProps = {
  permissions: PERMISSIONS,
  onQuickLink: vi.fn(),
  onPinToggle: vi.fn(),
  onCardActivate: vi.fn(),
};

describe('UpcomingEventsSection', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('defaults to list view with cards', () => {
    render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'List Show')]}
        {...zoneProps}
      />,
    );

    expect(screen.getByTestId('upcoming-view-list')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('List Show')).toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-mini-calendar')).not.toBeInTheDocument();
  });

  it('switches to calendar view without losing section data', async () => {
    const user = userEvent.setup();
    render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'Calendar Show')]}
        {...zoneProps}
      />,
    );

    await user.click(screen.getByTestId('upcoming-view-calendar'));
    expect(screen.getByTestId('upcoming-mini-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-event-11111111-1111-1111-1111-111111111111')).toHaveTextContent(
      'Calendar Show',
    );
    expect(screen.queryByTestId('event-card-11111111-1111-1111-1111-111111111111')).not.toBeInTheDocument();
  });

  it('shows empty message in calendar mode without mounting the grid', async () => {
    const user = userEvent.setup();
    render(<UpcomingEventsSection events={[]} {...zoneProps} />);

    await user.click(screen.getByTestId('upcoming-view-calendar'));
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-mini-calendar')).not.toBeInTheDocument();
  });

  it('persists calendar mode in sessionStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'Persist Show')]}
        {...zoneProps}
      />,
    );

    await user.click(screen.getByTestId('upcoming-view-calendar'));
    unmount();

    render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'Persist Show')]}
        {...zoneProps}
      />,
    );

    expect(screen.getByTestId('upcoming-view-calendar')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('upcoming-mini-calendar')).toBeInTheDocument();
  });

  it('resets to list view after sessionStorage clear', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'Reset Show')]}
        {...zoneProps}
      />,
    );

    await user.click(screen.getByTestId('upcoming-view-calendar'));
    sessionStorage.clear();
    unmount();

    render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'Reset Show')]}
        {...zoneProps}
      />,
    );

    expect(screen.getByTestId('upcoming-view-list')).toHaveAttribute('aria-pressed', 'true');
  });
});
