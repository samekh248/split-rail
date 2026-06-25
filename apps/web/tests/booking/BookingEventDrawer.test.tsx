import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingEventDrawer } from '@/components/booking/BookingEventDrawer';
import type { BookingPlacement } from '@/lib/bookingCalendar';

const pinMutate = vi.fn();
const unpinMutate = vi.fn();

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

vi.mock('@/api/dashboard', () => ({
  useDashboard: vi.fn(),
  usePinEvent: vi.fn(),
  useUnpinEvent: vi.fn(),
}));

vi.mock('@/api/events', () => ({
  useUpdateEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useUserProfile } from '@/api/user';
import { useDashboard, usePinEvent, useUnpinEvent } from '@/api/dashboard';

const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = '11111111-1111-1111-1111-111111111111';

const placement: BookingPlacement = {
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  venueName: 'The Majestic Valley Arena',
  regionId: null,
  regionName: null,
  title: 'Shane Smith',
  eventDate: '2026-06-26',
  bookingPlacementStatus: 'CONFIRMED',
  doorsTime: null,
  workspaceAllowed: true,
};

function renderDrawer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BookingEventDrawer
        open
        placement={placement}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe('BookingEventDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: true } } },
    } as ReturnType<typeof useUserProfile>);
    vi.mocked(useDashboard).mockReturnValue({
      data: {
        venueId: VENUE_ID,
        pinnedEvents: [],
        tonightEvents: [],
        upcomingEvents: [],
        recentEvents: [],
      },
    } as ReturnType<typeof useDashboard>);
    vi.mocked(usePinEvent).mockReturnValue({ mutate: pinMutate } as ReturnType<typeof usePinEvent>);
    vi.mocked(useUnpinEvent).mockReturnValue({ mutate: unpinMutate } as ReturnType<typeof useUnpinEvent>);
  });

  it('shows pin button next to the event title when user can view financials', () => {
    renderDrawer();

    expect(screen.getByTestId(`booking-event-drawer-pin-${EVENT_ID}`)).toHaveAttribute(
      'aria-label',
      'Pin event',
    );
  });

  it('hides pin button without financial permissions', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      data: { role: { permissions: { canViewFinancials: false } } },
    } as ReturnType<typeof useUserProfile>);

    renderDrawer();

    expect(screen.queryByTestId(`booking-event-drawer-pin-${EVENT_ID}`)).not.toBeInTheDocument();
  });

  it('calls pin mutation when unpinned', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByTestId(`booking-event-drawer-pin-${EVENT_ID}`));

    expect(pinMutate).toHaveBeenCalledWith(
      { venueId: VENUE_ID, eventId: EVENT_ID },
      expect.any(Object),
    );
  });

  it('calls unpin mutation when already pinned', async () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: {
        venueId: VENUE_ID,
        pinnedEvents: [{ eventId: EVENT_ID, venueId: VENUE_ID, isPinned: true }],
        tonightEvents: [],
        upcomingEvents: [],
        recentEvents: [],
      },
    } as ReturnType<typeof useDashboard>);

    const user = userEvent.setup();
    renderDrawer();

    expect(screen.getByTestId(`booking-event-drawer-pin-${EVENT_ID}`)).toHaveAttribute(
      'aria-label',
      'Unpin event',
    );

    await user.click(screen.getByTestId(`booking-event-drawer-pin-${EVENT_ID}`));

    expect(unpinMutate).toHaveBeenCalledWith(
      { venueId: VENUE_ID, eventId: EVENT_ID },
      expect.any(Object),
    );
  });
});
