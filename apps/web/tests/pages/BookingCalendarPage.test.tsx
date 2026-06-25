import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingCalendarPage } from '@/pages/BookingCalendarPage';
import { clearBookingCalendarDisplayModeCookie } from '@/lib/bookingCalendarViewStorage';

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
  useCalendarPlacements: () => ({ data: [], refetch: vi.fn() }),
}));

describe('BookingCalendarPage', () => {
  beforeEach(() => {
    clearBookingCalendarDisplayModeCookie();
    window.history.pushState({}, '', '/booking');
  });

  it('renders booking calendar shell', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCalendarPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('booking-calendar-page')).toBeInTheDocument();
    expect(screen.getByTestId('booking-calendar-controls')).toBeInTheDocument();
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
});
