import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingCalendarPage } from '@/pages/BookingCalendarPage';

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
  });
});
