import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VenueListGrouped } from '@/components/venue/VenueListGrouped';
import type { VenueRegionSection } from '@/lib/venueListView';

const VENUE = {
  id: 'venue-1',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
  regionId: 'region-a',
};

const VENUE_B = {
  id: 'venue-2',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-06-02T00:00:00Z',
  regionId: 'region-b',
};

const SECTIONS: VenueRegionSection[] = [
  {
    sectionKey: 'region-a',
    title: 'West',
    venues: [VENUE],
  },
  {
    sectionKey: 'region-b',
    title: 'East',
    venues: [VENUE_B],
  },
  {
    sectionKey: 'unassigned',
    title: 'Unassigned',
    venues: [],
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function stubFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(VENUE),
    }),
  );
}

describe('VenueListGrouped', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders grouped sections with headings', () => {
    render(
      <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTestId('venues-grouped-list')).toBeInTheDocument();
    expect(screen.getByTestId('venues-region-section-region-a')).toBeInTheDocument();
    expect(screen.getByText('West')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  it('shows empty message for sections without venues', () => {
    render(<VenueListGrouped sections={SECTIONS} onEdit={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('venues-region-empty-unassigned')).toHaveTextContent('No venues');
  });

  it('marks the unassigned section distinct from named regions', () => {
    render(<VenueListGrouped sections={SECTIONS} onEdit={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('venues-region-section-unassigned')).toHaveClass(
      'venues-group--unassigned',
    );
    expect(screen.getByTestId('venues-region-section-region-a')).not.toHaveClass(
      'venues-group--unassigned',
    );
    expect(screen.getByTestId('venues-region-section-region-b')).not.toHaveClass(
      'venues-group--unassigned',
    );
  });

  it('does not render a region column in grouped tables', () => {
    render(<VenueListGrouped sections={[SECTIONS[0]!]} onEdit={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument();
  });

  it('right-aligns the Actions header for every region section', () => {
    render(<VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const actionsHeaders = screen.getAllByRole('columnheader', { name: 'Actions' });
    expect(actionsHeaders).toHaveLength(2);
    actionsHeaders.forEach((header) => {
      expect(header).toHaveClass('venues-table__actions-col');
    });
  });

  it('invokes the edit handler', () => {
    const onEdit = vi.fn();
    render(
      <VenueListGrouped sections={[SECTIONS[0]!]} canManage onEdit={onEdit} />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByTestId(`edit-venue-${VENUE.id}`));
    expect(onEdit).toHaveBeenCalledWith(VENUE);
  });

  it('does not render a delete action in the row (delete moved into the edit modal)', () => {
    render(<VenueListGrouped sections={[SECTIONS[0]!]} canManage onEdit={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByTestId(`delete-venue-${VENUE.id}`)).not.toBeInTheDocument();
  });

  it('renders an Add venue button for named regions when the user can manage venues', () => {
    render(
      <VenueListGrouped
        sections={SECTIONS}
        canManage
        onEdit={vi.fn()}
       
        onAddVenue={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTestId('venues-add-venue-region-a')).toHaveTextContent('Add venue');
    expect(screen.getByTestId('venues-add-venue-region-b')).toHaveTextContent('Add venue');
  });

  it('does not render an Add venue button for the unassigned section', () => {
    render(
      <VenueListGrouped
        sections={SECTIONS}
        canManage
        onEdit={vi.fn()}
       
        onAddVenue={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.queryByTestId('venues-add-venue-unassigned')).not.toBeInTheDocument();
  });

  it('does not render Add venue buttons when the user cannot manage venues', () => {
    render(
      <VenueListGrouped
        sections={SECTIONS}
        canManage={false}
        onEdit={vi.fn()}
       
        onAddVenue={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.queryByTestId('venues-add-venue-region-a')).not.toBeInTheDocument();
  });

  it('calls onAddVenue with the section region id when clicked', () => {
    const onAddVenue = vi.fn();
    render(
      <VenueListGrouped
        sections={SECTIONS}
        canManage
        onEdit={vi.fn()}
       
        onAddVenue={onAddVenue}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByTestId('venues-add-venue-region-a'));
    expect(onAddVenue).toHaveBeenCalledWith('region-a');
  });

  describe('drag-and-drop reassignment (US1)', () => {
    it('renders a drag handle per row when canManage is true, and none when false (T003)', () => {
      const { rerender } = render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );
      expect(screen.getByTestId(`venue-drag-handle-${VENUE.id}`)).toBeInTheDocument();

      rerender(
        <VenueListGrouped sections={SECTIONS} canManage={false} onEdit={vi.fn()} />,
      );
      expect(screen.queryByTestId(`venue-drag-handle-${VENUE.id}`)).not.toBeInTheDocument();
    });

    it('dragging a venue onto a different region section reassigns it (T004)', async () => {
      stubFetchOk();
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.dragOver(screen.getByTestId('venues-region-table-region-b'));
      fireEvent.drop(screen.getByTestId('venues-region-table-region-b'));

      await waitFor(() => {
        const fetchMock = vi.mocked(globalThis.fetch);
        const putCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PUT');
        expect(putCall).toBeDefined();
        expect(String(putCall?.[0])).toContain(`/venues/${VENUE.id}`);
        expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
          name: VENUE.name,
          regionId: 'region-b',
        });
      });
    });

    it('shows a drop-target visual on the table being dragged over, and clears it on drag leave', () => {
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      const targetTable = screen.getByTestId('venues-region-table-region-b');

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      expect(targetTable).not.toHaveClass('venues-drop-target');

      fireEvent.dragEnter(targetTable);
      expect(targetTable).toHaveClass('venues-drop-target');

      fireEvent.dragLeave(targetTable, { relatedTarget: document.body });
      expect(targetTable).not.toHaveClass('venues-drop-target');
    });

    it('does not add the drop-target visual to the region header or Add venue button', () => {
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} onAddVenue={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      const targetTable = screen.getByTestId('venues-region-table-region-b');
      const section = screen.getByTestId('venues-region-section-region-b');

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.dragEnter(targetTable);

      expect(targetTable).toHaveClass('venues-drop-target');
      expect(section).not.toHaveClass('venues-drop-target');
    });

    it('shows a drop-target visual on the empty-region placeholder being dragged over', () => {
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      const emptyPlaceholder = screen.getByTestId('venues-region-empty-unassigned');

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.dragEnter(emptyPlaceholder);
      expect(emptyPlaceholder).toHaveClass('venues-drop-target');

      fireEvent.dragLeave(emptyPlaceholder, { relatedTarget: document.body });
      expect(emptyPlaceholder).not.toHaveClass('venues-drop-target');
    });

    it('clears the drop-target visual after a drop', () => {
      stubFetchOk();
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      const targetTable = screen.getByTestId('venues-region-table-region-b');

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.dragEnter(targetTable);
      expect(targetTable).toHaveClass('venues-drop-target');

      fireEvent.drop(targetTable);
      expect(targetTable).not.toHaveClass('venues-drop-target');
    });

    it('dropping onto the Unassigned section clears the region (T005)', async () => {
      stubFetchOk();
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.drop(screen.getByTestId('venues-region-empty-unassigned'));

      await waitFor(() => {
        const fetchMock = vi.mocked(globalThis.fetch);
        const putCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PUT');
        expect(putCall).toBeDefined();
        expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
          name: VENUE.name,
          regionId: null,
        });
      });
    });

    it('dropping onto the venue\'s own current section triggers no network call (T006)', () => {
      stubFetchOk();
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.drop(screen.getByTestId('venues-region-table-region-a'));

      const fetchMock = vi.mocked(globalThis.fetch);
      expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'PUT')).toHaveLength(0);
    });

    it('reverts a failed reassignment and shows an error (T007)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ detail: 'Server error' }),
        }),
      );
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.drop(screen.getByTestId('venues-region-table-region-b'));

      expect(await screen.findByTestId('venue-drag-error')).toBeInTheDocument();
      // The venue is still rendered under its original section prop (no local move without a
      // fresh `sections` prop from a successful refetch) — the row still exists.
      expect(screen.getByTestId(`venue-drag-handle-${VENUE.id}`)).toBeInTheDocument();
    });

    it('does not allow dragging a venue again while its reassignment is still pending (T008)', async () => {
      let resolvePut: (value: unknown) => void = () => {};
      const putPromise = new Promise((resolve) => {
        resolvePut = resolve;
      });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => putPromise),
      );
      render(
        <VenueListGrouped sections={SECTIONS} canManage onEdit={vi.fn()} />,
        { wrapper: createWrapper() },
      );

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.drop(screen.getByTestId('venues-region-table-region-b'));

      const fetchMock = vi.mocked(globalThis.fetch);
      await waitFor(() => {
        expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'PUT')).toHaveLength(1);
      });

      expect(screen.getByTestId(`venue-drag-handle-${VENUE.id}`)).toHaveAttribute(
        'draggable',
        'false',
      );

      fireEvent.dragStart(screen.getByTestId(`venue-drag-handle-${VENUE.id}`));
      fireEvent.drop(screen.getByTestId('venues-region-empty-unassigned'));

      expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'PUT')).toHaveLength(1);

      resolvePut({ ok: true, status: 200, json: () => Promise.resolve(VENUE) });
    });
  });
});
