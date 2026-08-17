import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingCalendarPage } from '@/pages/BookingCalendarPage';
import { clearBookingCalendarDisplayModeCookie } from '@/lib/bookingCalendarViewStorage';
import type { CalendarPlacementDto } from '@/types/generated-api';

const calendarPlacementsState = vi.hoisted(() => ({
  data: [] as CalendarPlacementDto[],
}));

vi.mock('@/venue/useActiveVenue', () => ({
  useActiveVenue: () => ({
    venues: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Hall A' }],
    activeVenueId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    isAllVenuesSelected: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    activateVenueId: vi.fn(),
  }),
}));

vi.mock('@/api/regions', () => ({
  useRegions: () => ({ data: [], refetch: vi.fn() }),
  useCreateRegion: () => ({ mutateAsync: vi.fn() }),
  useUpdateRegion: () => ({ mutateAsync: vi.fn() }),
  useDeleteRegion: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/api/calendar', () => ({
  useCalendarPlacements: () => ({ data: calendarPlacementsState.data, refetch: vi.fn() }),
}));

vi.mock('@/api/user', () => ({
  useUserProfile: () => ({
    data: {
      role: {
        permissions: {
          canManageFestivalSchedule: true,
          canPublishPublicItinerary: true,
        },
      },
    },
  }),
}));

const BOOKING_CALENDAR_TEST_DATE = new Date(2026, 5, 15);
const FESTIVAL_VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const FESTIVAL_EVENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function createFestivalPlacement(overrides: Partial<CalendarPlacementDto> = {}): CalendarPlacementDto {
  return {
    eventId: FESTIVAL_EVENT_ID,
    venueId: FESTIVAL_VENUE_ID,
    venueName: 'Hall A',
    regionId: null,
    regionName: null,
    title: 'Summer Fest',
    eventDate: '2026-06-15',
    bookingPlacementStatus: 'CONFIRMED',
    doorsTime: null,
    loadInTime: null,
    curfewTime: null,
    supportLineup: null,
    financialStatus: 'PRE_SHOW',
    isBudgetLocked: false,
    qboTagName: 'Summer Fest',
    hasLineItems: false,
    workspaceAllowed: true,
    ...overrides,
  };
}

describe('BookingCalendarPage', () => {
  beforeEach(() => {
    calendarPlacementsState.data = [];
    vi.useFakeTimers();
    vi.setSystemTime(BOOKING_CALENDAR_TEST_DATE);
    clearBookingCalendarDisplayModeCookie();
    window.history.pushState({}, '', '/booking');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders booking calendar shell', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-page')).toBeInTheDocument();
    expect(screen.getByTestId('booking-calendar-controls')).toBeInTheDocument();
    expect(screen.getByTestId('booking-calendar-legend')).toBeInTheDocument();
    expect(screen.getByTestId('booking-calendar-matrix')).toBeInTheDocument();
  });

  it('switches to list view when list toggle is selected', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId('booking-display-list'));

    expect(screen.getByTestId('booking-calendar-page')).toHaveClass('booking-calendar-page--list');
    expect(screen.getByTestId('booking-calendar-list')).toBeInTheDocument();
    expect(screen.getByTestId('booking-display-list')).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores list view from cookie on load', () => {
    document.cookie = 'bookingCalendarDisplayMode=list; Path=/; SameSite=Lax';

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-page')).toHaveClass('booking-calendar-page--list');
    expect(screen.getByTestId('booking-display-list')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render manage regions control', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('booking-manage-regions')).not.toBeInTheDocument();
  });

  it('opens placement type chooser from an empty day quick-add', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId('booking-cell-quick-add-2026-06-15'));

    expect(screen.getByTestId('booking-placement-type-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-create-event')).not.toBeInTheDocument();
    expect(screen.queryByTestId('booking-create-hold')).not.toBeInTheDocument();
  });

  it('opens create event modal after choosing confirmed event', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId('booking-cell-quick-add-2026-06-15'));
    fireEvent.click(screen.getByTestId('booking-placement-type-event'));

    expect(screen.queryByTestId('booking-placement-type-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('booking-create-event-modal')).toBeInTheDocument();
  });

  it('opens festival setup after choosing festival', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId('booking-cell-quick-add-2026-06-15'));
    fireEvent.click(screen.getByTestId('booking-placement-type-festival'));

    expect(screen.queryByTestId('booking-placement-type-modal')).not.toBeInTheDocument();
    const modal = screen.getByTestId('festival-setup-modal');
    expect(within(modal).getByLabelText(/Festival name/)).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Start date/)).toHaveValue('2026-06-15');
  });

  it('renders a festival wrapper on every day of its range without block flooding', () => {
    calendarPlacementsState.data = [
      createFestivalPlacement({
        eventDate: '2026-06-15',
        endDate: '2026-06-17',
        eventType: 'FESTIVAL',
      }),
    ];

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    const matrix = screen.getByTestId('booking-calendar-matrix');
    for (const dateKey of ['2026-06-15', '2026-06-16', '2026-06-17']) {
      const festivalDay = within(matrix).getByTestId(`booking-calendar-day-${dateKey}`);
      const placementTitles = festivalDay.querySelectorAll('.booking-calendar-matrix__event-title');
      expect(placementTitles).toHaveLength(1);
      expect(placementTitles[0]).toHaveTextContent('Summer Fest');
    }

    expect(within(matrix).queryByTestId('booking-cell-total-2026-06-15')).not.toBeInTheDocument();
    expect(calendarPlacementsState.data).toHaveLength(1);
  });

  it('opens the month from a deep link query', () => {
    window.history.pushState({}, '', '/booking?month=2026-08');

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-month-nav')).toHaveTextContent('August 2026');
    expect(screen.getByTestId('booking-calendar-day-2026-08-15')).toBeInTheDocument();
    expect(window.location.search).toBe('?month=2026-08');
  });

  it('writes the current month into the URL so refresh stays put', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-month-nav')).toHaveTextContent('June 2026');
    expect(window.location.search).toBe('?month=2026-06');
  });

  it('updates the URL when the month changes and restores it after remount', () => {
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId('booking-month-next'));

    expect(screen.getByTestId('booking-calendar-month-nav')).toHaveTextContent('July 2026');
    expect(window.location.search).toBe('?month=2026-07');

    unmount();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-month-nav')).toHaveTextContent('July 2026');
    expect(window.location.search).toBe('?month=2026-07');
  });

  it('falls back to the current month for an invalid month query', () => {
    window.history.pushState({}, '', '/booking?month=not-a-month');

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-month-nav')).toHaveTextContent('June 2026');
    expect(window.location.search).toBe('?month=2026-06');
  });
});
