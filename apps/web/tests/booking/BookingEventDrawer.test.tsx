import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingEventDrawer } from '@/components/booking/BookingEventDrawer';
import type { BookingPlacement } from '@/lib/bookingCalendar';

const pinMutate = vi.fn();
const unpinMutate = vi.fn();
const updateEventMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

vi.mock('@/api/dashboard', () => ({
  useDashboard: vi.fn(),
  usePinEvent: vi.fn(),
  useUnpinEvent: vi.fn(),
}));

vi.mock('@/api/events', () => ({
  useUpdateEvent: vi.fn(() => ({ mutateAsync: updateEventMutateAsync })),
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

function renderDrawer(overrides: Partial<BookingPlacement> = {}, onUpdated = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BookingEventDrawer
        open
        placement={{ ...placement, ...overrides }}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    </QueryClientProvider>,
  );
}

describe('BookingEventDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEventMutateAsync.mockReset().mockResolvedValue(undefined);
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

  it('renders a readable date span for a multi-day festival', () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
        }
      >
        <BookingEventDrawer
          open
          placement={{
            ...placement,
            title: 'Summer Fest',
            eventDate: '2026-06-15',
            endDate: '2026-06-17',
            eventType: 'FESTIVAL',
          }}
          onClose={vi.fn()}
          onUpdated={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-event-drawer-date')).toHaveTextContent(
      'Mon, 06/15/2026 – Wed, 06/17/2026',
    );
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeInTheDocument();
  });

  it('keeps edit and cancel booking on a standard event', async () => {
    const user = userEvent.setup();
    renderDrawer();

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    await user.click(screen.getByTestId('booking-event-drawer-actions-menu-trigger'));
    expect(screen.getByTestId('booking-event-drawer-cancel-booking')).toHaveTextContent(
      'Cancel booking',
    );
  });

  it('places Open workspace on the right as a primary action', () => {
    renderDrawer();

    const openWorkspace = screen.getByTestId('booking-event-drawer-open-workspace');
    expect(openWorkspace).toHaveClass('btn-primary');
    expect(openWorkspace.closest('.section-header__actions')).toBeInTheDocument();
    expect(openWorkspace.closest('.booking-event-drawer__actions')).toHaveClass('section-header');
  });

  // --- Show start time (spec 086 US2) ---------------------------------------

  it('renders doors-time and show-start-time fields in edit mode on a confirmed placement', async () => {
    const user = userEvent.setup();
    renderDrawer({ bookingPlacementStatus: 'CONFIRMED', doorsTime: '19:00', showStartTime: '20:00' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Doors time')).toBeEnabled();
    expect(screen.getByLabelText('Show start time')).toBeEnabled();
  });

  it('omits the show-start-time field entirely in edit mode on a hold placement', async () => {
    const user = userEvent.setup();
    renderDrawer({ bookingPlacementStatus: 'HOLD_1', doorsTime: '19:00' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Doors time')).toBeInTheDocument();
    expect(screen.queryByLabelText('Show start time')).not.toBeInTheDocument();
  });

  it('groups doors and show start together under one labelled schedule heading in detail mode', () => {
    renderDrawer({ bookingPlacementStatus: 'CONFIRMED', doorsTime: '19:00', showStartTime: '20:00' });

    const heading = screen.getByRole('heading', { name: 'Schedule' });
    const group = heading.closest('.booking-event-drawer__group')!;
    expect(within(group).getByText('Doors: 7:00 PM')).toBeInTheDocument();
    expect(within(group).getByText('Show start: 8:00 PM')).toBeInTheDocument();
  });

  it('communicates absent schedule times in words, not blank space', () => {
    renderDrawer({ bookingPlacementStatus: 'CONFIRMED', doorsTime: null, showStartTime: null });

    const heading = screen.getByRole('heading', { name: 'Schedule' });
    const group = heading.closest('.booking-event-drawer__group')!;
    expect(within(group).getByText('No schedule times set.')).toBeInTheDocument();
  });

  it('surfaces the server conflict message and keeps the submitted times on a rejected save', async () => {
    updateEventMutateAsync.mockRejectedValueOnce(
      new Error('Show start time (18:00) cannot be earlier than doors time (19:00).'),
    );
    const user = userEvent.setup();
    renderDrawer({ bookingPlacementStatus: 'CONFIRMED', doorsTime: '19:00', showStartTime: '20:00' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const showStartInput = screen.getByLabelText('Show start time');
    await user.clear(showStartInput);
    await user.type(showStartInput, '18:00');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Show start time (18:00) cannot be earlier than doors time (19:00).'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Show start time')).toHaveValue('18:00');
  });

  it('hides a retained show start time in detail mode while on hold, and shows it again once reconfirmed', () => {
    const { rerender } = renderDrawer({
      bookingPlacementStatus: 'HOLD_1',
      doorsTime: '19:00',
      showStartTime: '20:00',
    });

    expect(screen.getByText('Doors: 7:00 PM')).toBeInTheDocument();
    expect(screen.queryByText(/Show start:/)).not.toBeInTheDocument();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <BookingEventDrawer
          open
          placement={{
            ...placement,
            bookingPlacementStatus: 'CONFIRMED',
            doorsTime: '19:00',
            showStartTime: '20:00',
          }}
          onClose={vi.fn()}
          onUpdated={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Show start: 8:00 PM')).toBeInTheDocument();
  });

  it('retains a hidden show start time when saving an unrelated field on a hold placement', async () => {
    const user = userEvent.setup();
    renderDrawer({ bookingPlacementStatus: 'HOLD_1', doorsTime: '19:00', showStartTime: '20:00' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByLabelText('Show start time')).not.toBeInTheDocument();

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Renamed Show');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateEventMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ showStartTime: '20:00' }),
    );
  });

  // --- Supporting lineup (spec 086 US3) --------------------------------------

  it('renders a supporting-lineup textarea pre-filled from the placement in edit mode', async () => {
    const user = userEvent.setup();
    renderDrawer({ supportLineup: 'Openers: The Support Act' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Supporting lineup')).toHaveValue('Openers: The Support Act');
  });

  it('renders a saved lineup as readable text in detail mode without entering edit mode', () => {
    renderDrawer({ supportLineup: 'Openers: The Support Act' });

    expect(screen.getByRole('heading', { name: 'Lineup' })).toBeInTheDocument();
    expect(screen.getByText('Openers: The Support Act')).toBeInTheDocument();
  });

  it('renders no lineup control or section when there is no lineup', () => {
    renderDrawer({ supportLineup: null });

    expect(screen.queryByRole('heading', { name: 'Lineup' })).not.toBeInTheDocument();
  });

  it('saving a lineup change does not include any artist-relationship fields in the payload', async () => {
    const user = userEvent.setup();
    renderDrawer({ supportLineup: 'Openers: The Support Act' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const lineupInput = screen.getByLabelText('Supporting lineup');
    await user.clear(lineupInput);
    await user.type(lineupInput, 'Openers: New Act');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateEventMutateAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({
        artists: expect.anything(),
        eventArtists: expect.anything(),
      }),
    );
  });

  it('renders lineup markup as literal text in detail mode, never as a rendered element', () => {
    renderDrawer({ supportLineup: '<b>tag</b>' });

    const lineupText = screen.getByText('<b>tag</b>');
    expect(lineupText.tagName).not.toBe('B');
    expect(lineupText.querySelector('b')).toBeNull();
  });

  // --- Notes (spec 086 US4) ---------------------------------------------------

  it('renders a multi-line notes textarea pre-filled from the placement in edit mode', async () => {
    const user = userEvent.setup();
    renderDrawer({ notes: 'Line one\nLine two' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Notes')).toHaveValue('Line one\nLine two');
  });

  it('preserves line breaks and renders notes literally in detail mode', () => {
    renderDrawer({ notes: 'Line one\n<b>tag</b>\nLine three' });

    const heading = screen.getByRole('heading', { name: 'Notes' });
    const group = heading.closest('.booking-event-drawer__group')!;
    const notesText = group.querySelector('.booking-event-drawer__notes-text')!;
    expect(notesText.textContent).toBe('Line one\n<b>tag</b>\nLine three');
    expect(notesText.querySelector('b')).toBeNull();
  });

  it('renders no notes block when there are no notes', () => {
    renderDrawer({ notes: null });

    expect(screen.queryByRole('heading', { name: 'Notes' })).not.toBeInTheDocument();
  });

  it('shows a length-limit message before saving when notes exceed the accepted length', async () => {
    const user = userEvent.setup();
    renderDrawer({ notes: null });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const notesInput = screen.getByLabelText('Notes');
    fireEvent.change(notesInput, { target: { value: 'a'.repeat(2001) } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Notes cannot exceed 2000 characters.')).toBeInTheDocument();
    expect(updateEventMutateAsync).not.toHaveBeenCalled();
  });

  // --- Detail grouping structure (spec 086 US6) -------------------------------

  it('renders Schedule, Lineup, and Notes groupings under heading-level containers sharing one class', () => {
    renderDrawer({
      doorsTime: '19:00',
      showStartTime: '20:00',
      supportLineup: 'Openers',
      notes: 'A note',
    });

    for (const name of ['Schedule', 'Lineup', 'Notes']) {
      const heading = screen.getByRole('heading', { name });
      expect(heading).toHaveClass('booking-event-drawer__group-heading');
      expect(heading.closest('.booking-event-drawer__group')).toBeInTheDocument();
    }
  });

  it('keeps the actions row a structurally distinct sibling of the content groupings', () => {
    renderDrawer({ doorsTime: '19:00', supportLineup: 'Openers', notes: 'A note' });

    const actions = document.querySelector('.booking-event-drawer__actions')!;
    const groups = document.querySelectorAll('.booking-event-drawer__group');
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.contains(actions)).toBe(false);
      expect(actions.contains(group)).toBe(false);
    }
  });

  it('omits Lineup and Notes groupings and shows the words-based Schedule state when all three are empty', () => {
    renderDrawer({ doorsTime: null, showStartTime: null, supportLineup: null, notes: null });

    expect(screen.queryByRole('heading', { name: 'Lineup' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Notes' })).not.toBeInTheDocument();
    expect(screen.getByText('No schedule times set.')).toBeInTheDocument();
  });
});
