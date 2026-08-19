import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FestivalItineraryPage, festivalItineraryDocumentTitle } from '@/pages/FestivalItineraryPage';

const mutateAsync = vi.fn().mockResolvedValue({});
const refetch = vi.fn().mockResolvedValue({});

const itinerary = {
  days: [{ dayDate: '2026-08-14' }],
  stages: [
    { id: 'stage-1', name: 'Main Stage' },
    { id: 'stage-2', name: 'Side Stage' },
  ],
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

const { useItineraryMock, usePublicItineraryMock, pinEventMock, unpinEventMock, pinBlockMock, unpinBlockMock } =
  vi.hoisted(() => ({
    useItineraryMock: vi.fn(),
    usePublicItineraryMock: vi.fn(),
    pinEventMock: vi.fn(),
    unpinEventMock: vi.fn(),
    pinBlockMock: vi.fn(),
    unpinBlockMock: vi.fn(),
  }));

vi.mock('@/api/festivals', () => ({
  useItinerary: useItineraryMock,
  usePublicItinerary: usePublicItineraryMock,
  useUpdateBlock: () => ({ mutateAsync }),
  useSetBlockStatus: () => ({ mutateAsync }),
  useSetBlockBookingStatus: () => ({ mutateAsync }),
  useSetPublishVisibility: () => ({ mutateAsync, isPending: false }),
  useBlockHistory: () => ({ data: [], isLoading: false }),
  usePinProgrammingBlock: () => ({ mutate: pinBlockMock }),
  useUnpinProgrammingBlock: () => ({ mutate: unpinBlockMock }),
}));

vi.mock('@/api/events', () => ({
  useEvents: () => ({ data: [{ eventId: 'event-1', isPinned: false }] }),
}));

vi.mock('@/api/dashboard', () => ({
  usePinEvent: () => ({ mutate: pinEventMock }),
  useUnpinEvent: () => ({ mutate: unpinEventMock }),
}));

vi.mock('@/lib/eventWorkspaceRoute', () => ({
  navigateToEventWorkspace: vi.fn(),
}));

vi.mock('@/components/festival/BlockEditorDrawer', () => ({
  BlockEditorDrawer: ({
    open,
    block,
    initialDayDate,
    initialStageZoneId,
    initialStartTime,
    initialEndTime,
    onClose,
    onSaved,
    onPublishVisibilityChange,
  }: {
    open: boolean;
    block?: { id?: string } | null;
    initialDayDate?: string;
    initialStageZoneId?: string;
    initialStartTime?: string;
    initialEndTime?: string;
    onClose: () => void;
    onSaved?: (block: unknown) => void;
    onPublishVisibilityChange?: (isPublic: boolean) => void;
  }) =>
    open ? (
      <div
        data-testid="block-editor-drawer"
        data-mode={block?.id ? 'edit' : 'create'}
        data-day-date={initialDayDate}
        data-stage-zone-id={initialStageZoneId}
        data-start-time={initialStartTime}
        data-end-time={initialEndTime}
      >
        <button type="button" data-testid="drawer-mock-close" onClick={onClose}>
          Close
        </button>
        <button type="button" data-testid="drawer-mock-save" onClick={() => onSaved?.({})}>
          Save
        </button>
        <button
          type="button"
          data-testid="drawer-mock-publish"
          onClick={() => onPublishVisibilityChange?.(true)}
        >
          Publish
        </button>
      </div>
    ) : null,
}));

function renderPage(props: Partial<React.ComponentProps<typeof FestivalItineraryPage>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FestivalItineraryPage venueId="venue-1" eventId="event-1" canManage canPublish {...props} />
    </QueryClientProvider>,
  );
}

describe('FestivalItineraryPage', () => {
  beforeEach(() => {
    useItineraryMock.mockReturnValue({ data: itinerary, isLoading: false, isError: false, refetch });
    usePublicItineraryMock.mockReturnValue({
      data: { days: [], stages: [], blocks: [] },
      isLoading: false,
      refetch,
    });
    pinEventMock.mockClear();
    unpinEventMock.mockClear();
    pinBlockMock.mockClear();
    unpinBlockMock.mockClear();
  });

  it('renders the itinerary shell with timeline and filters', () => {
    renderPage();

    expect(screen.getByTestId('festival-itinerary-page')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument();
    expect(screen.getByTestId('itinerary-filters')).toBeInTheDocument();
    expect(screen.getByText('Headliner')).toBeInTheDocument();
    expect(screen.getByTestId('festival-itinerary-pin-event-1')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-block-pin-block-1')).toBeInTheDocument();
  });

  it('opens the block editor from add block', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('itinerary-add-block'));
    expect(screen.getByTestId('block-editor-drawer')).toBeInTheDocument();
  });

  it('switches to public view mode', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('festival-view-public'));
    expect(screen.getByTestId('festival-view-active-label')).toHaveTextContent(
      /Public itinerary preview/i,
    );
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

  it('opens a pre-seeded create form when an empty timeline slot is clicked', () => {
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-slot-stage-1-14:00'));
    fireEvent.pointerUp(document);

    const drawer = screen.getByTestId('block-editor-drawer');
    expect(drawer).toHaveAttribute('data-mode', 'create');
    expect(drawer).toHaveAttribute('data-day-date', '2026-08-14');
    expect(drawer).toHaveAttribute('data-stage-zone-id', 'stage-1');
    expect(drawer).toHaveAttribute('data-start-time', '14:00');
    expect(drawer).toHaveAttribute('data-end-time', '14:30');
  });

  it('opens the existing block editor, not a create form, when clicking its occupied slot', () => {
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-slot-stage-1-20:00'));
    fireEvent.pointerUp(document);

    const drawer = screen.getByTestId('block-editor-drawer');
    expect(drawer).toHaveAttribute('data-mode', 'edit');
  });

  it('moves a block across stages via useUpdateBlock, preserving its other fields', async () => {
    mutateAsync.mockClear();
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerEnter(screen.getByTestId('timeline-slot-stage-2-10:00'));
    fireEvent.pointerUp(document);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'block-1',
          title: 'Headliner',
          stageZoneId: 'stage-2',
          startTime: '10:00',
          endTime: '12:00',
          category: 'MUSIC',
        }),
      );
    });
  });

  it('resizes a block via useUpdateBlock, changing only the dragged bound', async () => {
    mutateAsync.mockClear();
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-resize-end-block-1'));
    fireEvent.pointerEnter(screen.getByTestId('timeline-slot-stage-1-22:30'));
    fireEvent.pointerUp(document);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'block-1',
          stageZoneId: 'stage-1',
          startTime: '20:00',
          endTime: '22:30',
        }),
      );
    });
  });

  it('routes a rejected move to the conflict dialog and leaves the block at its prior placement', async () => {
    mutateAsync.mockRejectedValueOnce(
      new Error("409: 'Other Act' already occupies this stage from 10:00 to 11:00."),
    );
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerEnter(screen.getByTestId('timeline-slot-stage-2-10:00'));
    fireEvent.pointerUp(document);

    await waitFor(() => {
      expect(screen.getByText(/Other Act/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-stage-id', 'stage-1');
    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-start-time', '20:00');

    mutateAsync.mockResolvedValue({});
  });

  it('routes a rejected resize to the conflict dialog and leaves the block at its prior duration', async () => {
    mutateAsync.mockRejectedValueOnce(
      new Error("409: 'Other Act' already occupies this stage from 22:00 to 23:00."),
    );
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-resize-end-block-1'));
    fireEvent.pointerEnter(screen.getByTestId('timeline-slot-stage-1-22:30'));
    fireEvent.pointerUp(document);

    await waitFor(() => {
      expect(screen.getByText(/Other Act/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-end-time', '22:00');

    mutateAsync.mockResolvedValue({});
  });

  it('shows a loading state while the itinerary is loading', () => {
    useItineraryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch });
    renderPage();

    expect(screen.getByText(/loading itinerary/i)).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-grid')).not.toBeInTheDocument();
  });

  it('shows an error state when the itinerary fails to load', () => {
    useItineraryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(/unable to load/i);
  });

  it('toggles the festival pin', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('festival-itinerary-pin-event-1'));

    expect(pinEventMock).toHaveBeenCalledWith({ venueId: 'venue-1', eventId: 'event-1' });
  });

  it('pins a block from the timeline in internal view', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('timeline-block-pin-block-1'));

    expect(pinBlockMock).toHaveBeenCalledWith({ venueId: 'venue-1', eventId: 'event-1', blockId: 'block-1' });
  });

  it('hides the add-block action for viewers without manage permission', () => {
    renderPage({ canManage: false });

    expect(screen.queryByTestId('itinerary-add-block')).not.toBeInTheDocument();
  });

  it('navigates back to the event workspace', async () => {
    const { navigateToEventWorkspace } = await import('@/lib/eventWorkspaceRoute');
    renderPage();

    fireEvent.click(screen.getByText('Back to event'));

    expect(navigateToEventWorkspace).toHaveBeenCalledWith('venue-1', 'event-1');
  });

  it('lets the scheduler pick a new time from the conflict dialog, opening the attempted block for edit', async () => {
    mutateAsync.mockRejectedValueOnce(
      new Error("409: 'Other Act' already occupies this stage from 10:00 to 11:00."),
    );
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerEnter(screen.getByTestId('timeline-slot-stage-2-10:00'));
    fireEvent.pointerUp(document);

    await waitFor(() => {
      expect(screen.getByText(/Other Act/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pick a new time'));

    expect(screen.queryByText(/Other Act/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('block-editor-drawer')).toHaveAttribute('data-mode', 'edit');

    mutateAsync.mockResolvedValue({});
  });

  it('dismisses the conflict dialog without changing anything', async () => {
    mutateAsync.mockRejectedValueOnce(
      new Error("409: 'Other Act' already occupies this stage from 10:00 to 11:00."),
    );
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerEnter(screen.getByTestId('timeline-slot-stage-2-10:00'));
    fireEvent.pointerUp(document);

    await waitFor(() => {
      expect(screen.getByText(/Other Act/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByText(/Other Act/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-stage-id', 'stage-1');

    mutateAsync.mockResolvedValue({});
  });

  it('toggles public visibility for the selected block', async () => {
    mutateAsync.mockClear();
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerUp(document);
    expect(screen.getByTestId('block-editor-drawer')).toHaveAttribute('data-mode', 'edit');

    fireEvent.click(screen.getByTestId('festival-publish-visibility'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ blockIds: ['block-1'], isPubliclyVisible: true }),
      );
    });
  });

  it('closes the block editor and clears the selected block', () => {
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerUp(document);
    expect(screen.getByTestId('block-editor-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('drawer-mock-close'));

    expect(screen.queryByTestId('block-editor-drawer')).not.toBeInTheDocument();
  });

  it('refetches the itinerary after the block editor saves', async () => {
    refetch.mockClear();
    renderPage();

    fireEvent.click(screen.getByTestId('itinerary-add-block'));
    fireEvent.click(screen.getByTestId('drawer-mock-save'));

    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
  });

  it('publishes visibility for the selected block from within the drawer', async () => {
    mutateAsync.mockClear();
    renderPage();

    fireEvent.pointerDown(screen.getByTestId('timeline-block-block-1'));
    fireEvent.pointerUp(document);

    fireEvent.click(screen.getByTestId('drawer-mock-publish'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ blockIds: ['block-1'], isPubliclyVisible: true }),
      );
    });
  });

  it('renders blocks from the public itinerary in public view mode', () => {
    usePublicItineraryMock.mockReturnValue({
      data: {
        days: [{ dayDate: '2026-08-14' }],
        stages: [{ id: 'stage-1', name: 'Main Stage' }],
        blocks: [
          {
            id: 'public-block-1',
            title: 'Public Set',
            dayDate: '2026-08-14',
            stageName: 'Main Stage',
            startTime: '18:00',
            endTime: '19:00',
            category: 'MUSIC',
          },
        ],
      },
      isLoading: false,
      refetch,
    });
    renderPage();

    fireEvent.click(screen.getByTestId('festival-view-public'));

    expect(screen.getByText('Public Set')).toBeInTheDocument();
  });
});
