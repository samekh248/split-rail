import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('renders upcoming events as compact list cards', () => {
    render(
      <UpcomingEventsSection
        events={[upcomingEvent('11111111-1111-1111-1111-111111111111', 'List Show')]}
        {...zoneProps}
      />,
    );

    expect(screen.getByTestId('dashboard-zone-upcoming')).toBeInTheDocument();
    expect(screen.getByText('List Show')).toBeInTheDocument();
    expect(screen.getByTestId('event-card-11111111-1111-1111-1111-111111111111')).toHaveClass(
      'event-card--compact',
    );
    expect(screen.queryByTestId('upcoming-view-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upcoming-mini-calendar')).not.toBeInTheDocument();
  });

  it('shows empty message when there are no upcoming events', () => {
    render(<UpcomingEventsSection events={[]} {...zoneProps} />);

    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });
});
