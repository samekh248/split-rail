import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FestivalItineraryPage, festivalItineraryDocumentTitle } from '@/pages/FestivalItineraryPage';

const mutateAsync = vi.fn().mockResolvedValue({});
const refetch = vi.fn().mockResolvedValue({});

const itinerary = {
  days: [{ dayDate: '2026-08-14' }],
  stages: [{ id: 'stage-1', name: 'Main Stage' }],
  blocks: [
    {
      id: 'block-1',
      title: 'Headliner',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      stageName: 'Main Stage',
      startTime: '20:00',
      endTime: '22:00',
      category: 'MUSIC',
      scheduleStatus: 'SCHEDULED',
      bookingStatus: 'HOLD',
    },
  ],
};

vi.mock('@/api/festivals', () => ({
  useItinerary: () => ({ data: itinerary, isLoading: false, isError: false, refetch }),
  usePublicItinerary: () => ({ data: { days: [], stages: [], blocks: [] }, isLoading: false, refetch }),
  useUpdateBlock: () => ({ mutateAsync }),
  useSetBlockStatus: () => ({ mutateAsync }),
  useSetBlockBookingStatus: () => ({ mutateAsync }),
  useSetPublishVisibility: () => ({ mutateAsync, isPending: false }),
  useBlockHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/lib/eventWorkspaceRoute', () => ({
  navigateToEventWorkspace: vi.fn(),
}));

vi.mock('@/components/festival/BlockEditorDrawer', () => ({
  BlockEditorDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="block-editor-drawer" /> : null,
}));

function renderPage(props: Partial<React.ComponentProps<typeof FestivalItineraryPage>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FestivalItineraryPage venueId="venue-1" eventId="event-1" canManage canPublish {...props} />
    </QueryClientProvider>,
  );
}

describe('FestivalItineraryPage', () => {
  it('renders the itinerary shell with timeline and filters', () => {
    renderPage();

    expect(screen.getByTestId('festival-itinerary-page')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument();
    expect(screen.getByTestId('itinerary-filters')).toBeInTheDocument();
    expect(screen.getByText('Headliner')).toBeInTheDocument();
  });

  it('opens the block editor from add block', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('itinerary-add-block'));
    expect(screen.getByTestId('block-editor-drawer')).toBeInTheDocument();
  });

  it('switches to public view mode', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('festival-view-public'));
    expect(screen.getByTestId('festival-view-active-label')).toHaveTextContent(/Public view/i);
  });

  it('promotes a held block to confirmed from the timeline', async () => {
    mutateAsync.mockClear();
    // The view toggle persists across renders, and only the internal view carries holds.
    window.localStorage.clear();
    renderPage();

    fireEvent.click(screen.getByTestId('timeline-block-booking-block-1'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        blockId: 'block-1',
        bookingStatus: 'CONFIRMED',
      });
    });
  });

  it('builds a document title from route ids', () => {
    expect(festivalItineraryDocumentTitle('venue-1', 'event-1')).toContain('Itinerary');
    expect(festivalItineraryDocumentTitle('venue-1', 'event-1')).toContain('venue-1');
  });
});
