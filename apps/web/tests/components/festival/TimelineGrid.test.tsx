import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineGrid } from '@/components/festival/TimelineGrid';
import type { ProgrammingBlockResponse } from '@/types/generated-api';

const days = [{ dayDate: '2026-08-14' }, { dayDate: '2026-08-15' }];
const stages = [
  { id: 'stage-1', name: 'Main Stage', sortOrder: 0, blockCount: 1 },
  { id: 'stage-2', name: 'Side Stage', sortOrder: 1, blockCount: 1 },
];

const dayOneBlocks: ProgrammingBlockResponse[] = [
  {
    id: 'block-1',
    title: 'Opening Act',
    dayDate: '2026-08-14',
    stageZoneId: 'stage-1',
    stageName: 'Main Stage',
    startTime: '14:00',
    endTime: '15:00',
    category: 'MUSIC',
    scheduleStatus: 'SCHEDULED',
    bookingStatus: 'HOLD',
  },
  {
    id: 'block-2',
    title: 'Headliner',
    dayDate: '2026-08-14',
    stageZoneId: 'stage-2',
    stageName: 'Side Stage',
    startTime: '20:00',
    endTime: '21:30',
    category: 'MUSIC',
    scheduleStatus: 'SCHEDULED',
    bookingStatus: 'CONFIRMED',
  },
];

const dayTwoBlocks: ProgrammingBlockResponse[] = [
  {
    id: 'block-3',
    title: 'Sunday Brunch Band',
    dayDate: '2026-08-15',
    stageZoneId: 'stage-1',
    startTime: '11:00',
    endTime: '12:00',
    category: 'MUSIC',
    scheduleStatus: 'SCHEDULED',
  },
];

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderGrid(
  overrides: Partial<Parameters<typeof TimelineGrid>[0]> = {},
  blocks = dayOneBlocks,
) {
  const onConflict = vi.fn();
  const onBlockPlacementChange = vi.fn().mockResolvedValue(undefined);
  const onSlotClick = vi.fn();
  const onBlockClick = vi.fn();

  const view = render(
    <TimelineGrid
      venueId="venue-1"
      eventId="event-1"
      days={days}
      stages={stages}
      blocks={blocks}
      selectedDay="2026-08-14"
      onDayChange={vi.fn()}
      onBlockClick={onBlockClick}
      onSlotClick={onSlotClick}
      onBlockPlacementChange={onBlockPlacementChange}
      onConflict={onConflict}
      canManage
      {...overrides}
    />,
    { wrapper: Wrapper },
  );

  return { ...view, onConflict, onBlockPlacementChange, onSlotClick, onBlockClick };
}

function press(testId: string) {
  fireEvent.pointerDown(screen.getByTestId(testId));
}

function enter(testId: string) {
  fireEvent.pointerEnter(screen.getByTestId(testId));
}

function release() {
  fireEvent.pointerUp(document);
}

function pressBlock(blockId: string) {
  press(`timeline-block-${blockId}`);
}

function pressEdge(blockId: string, edge: 'start' | 'end') {
  press(`timeline-block-resize-${edge}-${blockId}`);
}

function pressSlot(stageId: string, time: string) {
  press(`timeline-slot-${stageId}-${time}`);
}

function enterSlot(stageId: string, time: string) {
  enter(`timeline-slot-${stageId}-${time}`);
}

describe('TimelineGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vertical time slots and stage columns with blocks positioned on the selected day', () => {
    renderGrid();

    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-time-header')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-row-stage-1')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-row-stage-2')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-slot-stage-1-08:00')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-slot-stage-1-14:00')).toBeInTheDocument();

    const openingAct = screen.getByTestId('timeline-block-block-1');
    expect(openingAct).toHaveTextContent('Opening Act');
    expect(openingAct).toHaveAttribute('data-stage-id', 'stage-1');
    expect(openingAct).toHaveAttribute('data-start-time', '14:00');
    expect(openingAct).toHaveStyle({ top: '37.5%', height: '6.25%' });

    expect(screen.queryByTestId('timeline-block-block-3')).not.toBeInTheDocument();
  });

  it('shows a day switcher and filters blocks when the active day changes', async () => {
    const onDayChange = vi.fn();
    const { rerender } = renderGrid({ onDayChange });

    const switcher = screen.getByTestId('timeline-day-switcher');
    expect(within(switcher).getByRole('button', { name: /Aug 14/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(within(switcher).getByRole('button', { name: /Aug 15/i }));
    expect(onDayChange).toHaveBeenCalledWith('2026-08-15');

    rerender(
      <TimelineGrid
        venueId="venue-1"
        eventId="event-1"
        days={days}
        stages={stages}
        blocks={dayTwoBlocks}
        selectedDay="2026-08-15"
        onDayChange={onDayChange}
        onBlockPlacementChange={vi.fn()}
        onConflict={vi.fn()}
        canManage
      />,
    );

    expect(screen.getByTestId('timeline-block-block-3')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-block-block-1')).not.toBeInTheDocument();
  });

  it('exposes grid semantics and category/status text beyond color alone', () => {
    renderGrid();

    expect(screen.getByRole('grid', { name: /festival timeline/i })).toBeInTheDocument();
    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-category', 'MUSIC');
    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-schedule-status', 'SCHEDULED');
  });

  // --- US1: create from an empty slot -------------------------------------

  describe('US1 — create from an empty slot', () => {
    it('clicking an empty slot (no movement) calls onSlotClick seeded with day/stage/start and a 30-minute default end', () => {
      const { onSlotClick } = renderGrid();

      pressSlot('stage-1', '18:00');
      release();

      expect(onSlotClick).toHaveBeenCalledWith({
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '18:00',
        endTime: '18:30',
      });
    });

    it('clicking a slot covered by an existing active block opens that block instead of creating', () => {
      const { onSlotClick, onBlockClick } = renderGrid();

      pressSlot('stage-1', '14:30');
      release();

      expect(onSlotClick).not.toHaveBeenCalled();
      expect(onBlockClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'block-1' }));
    });

    it('does not create or move anything when canManage is false', () => {
      const { onSlotClick, onBlockPlacementChange } = renderGrid({ canManage: false });

      pressSlot('stage-1', '18:00');
      release();

      expect(onSlotClick).not.toHaveBeenCalled();
      expect(onBlockPlacementChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-start-time', '14:00');
    });
  });

  // --- Drag-to-create on empty time ----------------------------------------

  describe('drag-to-create on empty time', () => {
    it('shows a growing draft block immediately while sweeping out a span', () => {
      renderGrid();

      expect(screen.queryByTestId('timeline-draft-block')).not.toBeInTheDocument();

      pressSlot('stage-1', '09:00');
      enterSlot('stage-1', '10:00');

      const draft = screen.getByTestId('timeline-draft-block');
      expect(draft).toHaveAttribute('data-start-time', '09:00');
      expect(draft).toHaveAttribute('data-end-time', '10:00');

      // Dragging further grows it rather than starting over.
      enterSlot('stage-1', '11:30');
      expect(screen.getByTestId('timeline-draft-block')).toHaveAttribute('data-end-time', '11:30');
    });

    it('stops growing on release and opens the create form pre-filled with the swept span', () => {
      const { onSlotClick } = renderGrid();

      pressSlot('stage-1', '09:00');
      enterSlot('stage-1', '11:00');
      release();

      expect(screen.queryByTestId('timeline-draft-block')).not.toBeInTheDocument();
      expect(onSlotClick).toHaveBeenCalledWith({
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '09:00',
        endTime: '11:00',
      });
    });

    it('draws the draft in the stage column the drag started from', () => {
      renderGrid();

      pressSlot('stage-2', '09:00');
      enterSlot('stage-2', '10:00');

      expect(
        within(screen.getByTestId('timeline-stage-row-stage-2')).getByTestId('timeline-draft-block'),
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('timeline-stage-row-stage-1')).queryByTestId('timeline-draft-block'),
      ).not.toBeInTheDocument();
    });

    it('marks a swept span that overlaps an existing block as invalid', () => {
      renderGrid();

      // block-1 occupies stage-1 14:00–15:00.
      pressSlot('stage-1', '13:00');
      enterSlot('stage-1', '14:30');

      expect(screen.getByTestId('timeline-draft-block')).toHaveClass('timeline-block-card--invalid');
    });

    it('still treats a press with no drag as a plain one-slot create', () => {
      const { onSlotClick } = renderGrid();

      pressSlot('stage-1', '09:00');
      release();

      expect(onSlotClick).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: '09:00', endTime: '09:30' }),
      );
    });

    it('does not draft anything for a viewer who cannot manage the schedule', () => {
      const { onSlotClick } = renderGrid({ canManage: false });

      pressSlot('stage-1', '09:00');
      enterSlot('stage-1', '11:00');

      expect(screen.queryByTestId('timeline-draft-block')).not.toBeInTheDocument();
      release();
      expect(onSlotClick).not.toHaveBeenCalled();
    });
  });

  // --- US2: move by dragging, including cross-stage -----------------------

  describe('US2 — move by dragging', () => {
    it('pressing a block body with no movement calls onBlockClick and not onBlockPlacementChange', () => {
      const { onBlockClick, onBlockPlacementChange } = renderGrid();

      pressBlock('block-1');
      release();

      expect(onBlockClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'block-1' }));
      expect(onBlockPlacementChange).not.toHaveBeenCalled();
    });

    it('dragging a block to an empty time on the same stage fires a move placement change', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith({
          kind: 'move',
          blockId: 'block-1',
          dayDate: '2026-08-14',
          stageZoneId: 'stage-1',
          startTime: '16:00',
          endTime: '17:00',
        });
      });
    });

    it('dragging a block onto an empty time on a different stage moves it there with duration unchanged', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressBlock('block-1');
      enterSlot('stage-2', '10:00');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith({
          kind: 'move',
          blockId: 'block-1',
          dayDate: '2026-08-14',
          stageZoneId: 'stage-2',
          startTime: '10:00',
          endTime: '11:00',
        });
      });
    });

    it('carries the card itself to the drag target, including across stages', () => {
      renderGrid();

      // Before: the card lives in its saved column at its saved time.
      expect(
        within(screen.getByTestId('timeline-stage-row-stage-1')).getByTestId('timeline-block-block-1'),
      ).toBeInTheDocument();

      pressBlock('block-1');
      enterSlot('stage-2', '10:00');

      // During: it has moved into the target column and reads out the prospective time.
      const moved = within(screen.getByTestId('timeline-stage-row-stage-2')).getByTestId(
        'timeline-block-block-1',
      );
      expect(moved).toHaveTextContent('10:00 AM–11:00 AM');
      expect(
        within(screen.getByTestId('timeline-stage-row-stage-1')).queryByTestId('timeline-block-block-1'),
      ).not.toBeInTheDocument();
    });

    it('flags the dragged card itself when the prospective placement conflicts', () => {
      renderGrid();

      pressBlock('block-1');
      enterSlot('stage-2', '20:30');

      expect(screen.getByTestId('timeline-block-block-1')).toHaveClass(
        'timeline-block-card--invalid',
      );
    });

    it('shows a valid-drop preview while hovering a valid empty target', () => {
      renderGrid();

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');

      expect(screen.getByTestId('timeline-slot-stage-1-16:00')).toHaveClass('timeline-slot--valid');
      expect(screen.getByTestId('timeline-slot-stage-1-16:00')).not.toHaveClass('timeline-slot--warning');
    });

    it('does not allow a drag to start when canManage is false', () => {
      const { onBlockPlacementChange } = renderGrid({ canManage: false });

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      release();

      expect(onBlockPlacementChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-start-time', '14:00');
    });

    it('dropping a block back onto its own current stage/time is a no-op', () => {
      const { onBlockPlacementChange } = renderGrid();

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      enterSlot('stage-1', '14:00');
      release();

      expect(onBlockPlacementChange).not.toHaveBeenCalled();
    });

    it('a canceled block does not block a move onto its former time/stage', async () => {
      const canceledBlocks: ProgrammingBlockResponse[] = [
        ...dayOneBlocks,
        {
          id: 'block-4',
          title: 'Withdrawn Act',
          dayDate: '2026-08-14',
          stageZoneId: 'stage-1',
          startTime: '16:00',
          endTime: '17:00',
          category: 'MUSIC',
          scheduleStatus: 'CANCELED',
        },
      ];
      const { onBlockPlacementChange } = renderGrid({}, canceledBlocks);

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith(
          expect.objectContaining({ blockId: 'block-1', stageZoneId: 'stage-1', startTime: '16:00' }),
        );
      });
    });

    it('keeps the block in its original slot when move fails as a conflict and reports it', async () => {
      const onConflict = vi.fn();
      const onBlockPlacementChange = vi
        .fn()
        .mockRejectedValue(new Error("409: 'Headliner' already occupies this stage from 20:00 to 21:30."));

      render(
        <TimelineGrid
          venueId="venue-1"
          eventId="event-1"
          days={days}
          stages={stages}
          blocks={dayOneBlocks}
          selectedDay="2026-08-14"
          onDayChange={vi.fn()}
          onBlockPlacementChange={onBlockPlacementChange}
          onConflict={onConflict}
          canManage
        />,
        { wrapper: Wrapper },
      );

      const openingAct = screen.getByTestId('timeline-block-block-1');
      expect(openingAct).toHaveAttribute('data-stage-id', 'stage-1');
      expect(openingAct).toHaveAttribute('data-start-time', '14:00');

      pressBlock('block-1');
      enterSlot('stage-2', '20:00');
      release();

      await waitFor(() => {
        expect(onConflict).toHaveBeenCalledWith(
          expect.objectContaining({
            conflictingBlockTitle: 'Headliner',
            message: expect.stringContaining('Headliner'),
          }),
          expect.objectContaining({ id: 'block-1', stageZoneId: 'stage-1', startTime: '14:00' }),
        );
      });

      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-stage-id', 'stage-1');
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-start-time', '14:00');
    });
  });

  // --- US3: resize by dragging an edge -------------------------------------

  describe('US3 — resize by dragging an edge', () => {
    it('dragging the end edge later resizes only the end bound', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'end');
      enterSlot('stage-1', '15:30');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith({
          kind: 'resize',
          blockId: 'block-1',
          dayDate: '2026-08-14',
          stageZoneId: 'stage-1',
          startTime: '14:00',
          endTime: '15:30',
        });
      });
    });

    it('dragging the start edge earlier resizes only the start bound', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'start');
      enterSlot('stage-1', '13:30');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith({
          kind: 'resize',
          blockId: 'block-1',
          dayDate: '2026-08-14',
          stageZoneId: 'stage-1',
          startTime: '13:30',
          endTime: '15:00',
        });
      });
    });

    it('shows a live preview of the prospective duration while resizing', () => {
      renderGrid();

      pressEdge('block-1', 'end');
      enterSlot('stage-1', '15:30');

      expect(screen.getByTestId('timeline-slot-stage-1-15:00')).toHaveClass('timeline-slot--valid');
    });

    it('refuses a resize that would drop duration below one interval', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'end');
      enterSlot('stage-1', '14:00');
      release();

      expect(onBlockPlacementChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-start-time', '14:00');
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-end-time', '15:00');
    });

    it('allows resizing an end bound out to the last visible slot at the day boundary', async () => {
      const lateBlocks: ProgrammingBlockResponse[] = [
        {
          id: 'block-5',
          title: 'Late Set',
          dayDate: '2026-08-14',
          stageZoneId: 'stage-1',
          startTime: '22:30',
          endTime: '23:00',
          category: 'MUSIC',
          scheduleStatus: 'SCHEDULED',
        },
      ];
      const { onBlockPlacementChange } = renderGrid({}, lateBlocks);

      // The grid renders no slot beyond 23:30 (the last half-hour of the visible day), so a
      // resize gesture driven by slot entry structurally cannot request a time past the day
      // bounds — this is the practical backstop for FR-006's bounds refusal; the pure-function
      // refusal itself is covered directly in timelineUtils.test.ts.
      pressEdge('block-5', 'end');
      enterSlot('stage-1', '23:30');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith(
          expect.objectContaining({ blockId: 'block-5', startTime: '22:30', endTime: '23:30' }),
        );
      });
    });

    it('a press on an edge with no movement resizes nothing (not treated as a click or move)', () => {
      const { onBlockClick, onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'end');
      release();

      expect(onBlockClick).not.toHaveBeenCalled();
      expect(onBlockPlacementChange).not.toHaveBeenCalled();
    });

    it('resizing never changes the stage of the block', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'end');
      enterSlot('stage-1', '15:30');
      release();

      await waitFor(() => expect(onBlockPlacementChange).toHaveBeenCalled());
      const call = onBlockPlacementChange.mock.calls[0][0];
      expect(call.stageZoneId).toBe('stage-1');
    });

    it('stops the card from intercepting pointer events for the whole gesture, including before any movement', () => {
      // Shrinking a block (dragging an edge inward) never leaves the card's own footprint, so
      // the underlying slot cells can only receive pointer events if the card stops occluding
      // them for the entire press-through-release gesture — not just once movement begins.
      renderGrid();

      pressEdge('block-1', 'end');
      expect(screen.getByTestId('timeline-block-block-1')).toHaveClass('timeline-block-card--gesturing');
    });

    it('does not apply the lifted drag styling until the press actually becomes a drag', () => {
      renderGrid();

      pressEdge('block-1', 'end');
      expect(screen.getByTestId('timeline-block-block-1')).not.toHaveClass(
        'timeline-block-card--dragging',
      );

      enterSlot('stage-1', '15:30');
      expect(screen.getByTestId('timeline-block-block-1')).toHaveClass('timeline-block-card--dragging');
    });

    it('shrinks a block by dragging its end edge up into the block\'s own footprint', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'end');
      enterSlot('stage-1', '14:30');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'resize', blockId: 'block-1', startTime: '14:00', endTime: '14:30' }),
        );
      });
    });

    it('shrinks a block by dragging its start edge down into the block\'s own footprint', async () => {
      const { onBlockPlacementChange } = renderGrid();

      pressEdge('block-1', 'start');
      enterSlot('stage-1', '14:30');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'resize', blockId: 'block-1', startTime: '14:30', endTime: '15:00' }),
        );
      });
    });
  });

  // --- Optimistic save + sync affordance -----------------------------------

  describe('optimistic placement while saving', () => {
    /** A save that stays in flight until the test resolves or rejects it. */
    function deferredSave() {
      let resolveSave: () => void = () => {};
      let rejectSave: (error: unknown) => void = () => {};
      const onBlockPlacementChange = vi.fn(
        () =>
          new Promise<void>((resolve, reject) => {
            resolveSave = resolve;
            rejectSave = reject;
          }),
      );
      return {
        onBlockPlacementChange,
        resolve: () => resolveSave(),
        reject: (error: unknown) => rejectSave(error),
      };
    }

    it('keeps the block at its dropped position while the save is still in flight', async () => {
      const save = deferredSave();
      renderGrid({ onBlockPlacementChange: save.onBlockPlacementChange });

      pressBlock('block-1');
      enterSlot('stage-2', '10:00');
      release();

      await waitFor(() => expect(save.onBlockPlacementChange).toHaveBeenCalled());

      // The server has not answered yet, but the card already lives at the new placement.
      const card = screen.getByTestId('timeline-block-block-1');
      expect(card).toHaveAttribute('data-stage-id', 'stage-2');
      expect(card).toHaveAttribute('data-start-time', '10:00');
      expect(card).toHaveAttribute('data-end-time', '11:00');
      expect(
        within(screen.getByTestId('timeline-stage-row-stage-2')).getByTestId('timeline-block-block-1'),
      ).toBeInTheDocument();
    });

    it('shows a sync spinner on the block only while the save is in flight', async () => {
      const save = deferredSave();
      const { rerender } = renderGrid({ onBlockPlacementChange: save.onBlockPlacementChange });

      expect(screen.queryByTestId('timeline-block-sync-block-1')).not.toBeInTheDocument();

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      release();

      await waitFor(() => {
        expect(screen.getByTestId('timeline-block-sync-block-1')).toBeInTheDocument();
      });
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-syncing', 'true');

      // Server confirms, and the refreshed data arrives carrying the new placement.
      const saved = [{ ...dayOneBlocks[0], startTime: '16:00', endTime: '17:00' }, dayOneBlocks[1]];
      save.resolve();
      rerender(
        <TimelineGrid
          venueId="venue-1"
          eventId="event-1"
          days={days}
          stages={stages}
          blocks={saved}
          selectedDay="2026-08-14"
          onDayChange={vi.fn()}
          onBlockPlacementChange={save.onBlockPlacementChange}
          onConflict={vi.fn()}
          canManage
        />,
      );

      await waitFor(() => {
        expect(screen.queryByTestId('timeline-block-sync-block-1')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-start-time', '16:00');
    });

    it('rolls the block back to its saved placement when the save is refused', async () => {
      const save = deferredSave();
      const onConflict = vi.fn();
      renderGrid({ onBlockPlacementChange: save.onBlockPlacementChange, onConflict });

      pressBlock('block-1');
      enterSlot('stage-2', '10:00');
      release();

      await waitFor(() => {
        expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-stage-id', 'stage-2');
      });

      save.reject(new Error("409: 'Headliner' already occupies this stage from 20:00 to 21:30."));

      await waitFor(() => expect(onConflict).toHaveBeenCalled());
      await waitFor(() => {
        const card = screen.getByTestId('timeline-block-block-1');
        expect(card).toHaveAttribute('data-stage-id', 'stage-1');
        expect(card).toHaveAttribute('data-start-time', '14:00');
      });
      expect(screen.queryByTestId('timeline-block-sync-block-1')).not.toBeInTheDocument();
    });

    it('refuses a second gesture on a block that is still saving', async () => {
      const save = deferredSave();
      renderGrid({ onBlockPlacementChange: save.onBlockPlacementChange });

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      release();

      await waitFor(() => expect(save.onBlockPlacementChange).toHaveBeenCalledTimes(1));

      pressBlock('block-1');
      enterSlot('stage-1', '18:00');
      release();

      expect(save.onBlockPlacementChange).toHaveBeenCalledTimes(1);
    });

    it('lets a different block be dragged while one is still saving', async () => {
      const save = deferredSave();
      renderGrid({ onBlockPlacementChange: save.onBlockPlacementChange });

      pressBlock('block-1');
      enterSlot('stage-1', '16:00');
      release();
      await waitFor(() => expect(save.onBlockPlacementChange).toHaveBeenCalledTimes(1));

      pressBlock('block-2');
      enterSlot('stage-2', '09:00');
      release();

      await waitFor(() => expect(save.onBlockPlacementChange).toHaveBeenCalledTimes(2));
      expect(screen.getByTestId('timeline-block-sync-block-1')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-block-sync-block-2')).toBeInTheDocument();
    });
  });

  // --- Size-aware content priority -----------------------------------------

  describe('small blocks prioritise the act name', () => {
    const shortBlock: ProgrammingBlockResponse = {
      ...dayOneBlocks[0],
      title: 'Tiny Set',
      startTime: '14:00',
      endTime: '14:30',
    };

    it('shows only the name on a one-slot block, dropping time, status, and badges', () => {
      renderGrid({}, [shortBlock]);

      const card = screen.getByTestId('timeline-block-block-1');
      expect(card).toHaveAttribute('data-density', 'compact');
      expect(card).toHaveTextContent('Tiny Set');
      expect(card).not.toHaveTextContent('2:00 PM–2:30 PM');
      expect(card).not.toHaveTextContent('Scheduled');
      expect(screen.queryByTestId('timeline-block-booking-block-1')).not.toBeInTheDocument();
    });

    it('keeps the name and time but drops the redundant status line on a two-slot block', () => {
      renderGrid({}, [{ ...shortBlock, endTime: '15:00' }]);

      const card = screen.getByTestId('timeline-block-block-1');
      expect(card).toHaveAttribute('data-density', 'short');
      expect(card).toHaveTextContent('Tiny Set');
      expect(card).toHaveTextContent('2:00 PM–3:00 PM');
      expect(card).not.toHaveTextContent('Scheduled');
      expect(screen.getByTestId('timeline-block-booking-block-1')).toBeInTheDocument();
    });

    it('shows the full detail set once the block is tall enough', () => {
      renderGrid({}, [{ ...shortBlock, endTime: '16:00' }]);

      const card = screen.getByTestId('timeline-block-block-1');
      expect(card).toHaveAttribute('data-density', 'full');
      expect(card).toHaveTextContent('Tiny Set');
      expect(card).toHaveTextContent('2:00 PM–4:00 PM');
      expect(card).toHaveTextContent('Scheduled');
    });

    it('re-densifies live as a resize gesture shrinks the block', () => {
      renderGrid({}, [{ ...shortBlock, endTime: '16:00' }]);
      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-density', 'full');

      pressEdge('block-1', 'end');
      enterSlot('stage-1', '14:30');

      expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-density', 'compact');
    });
  });

  // --- US4: refuse same-stage overlap, allow cross-stage -------------------

  describe('US4 — overlap refusal', () => {
    it('shows a conflict preview when hovering a same-stage occupied time during a move', () => {
      renderGrid();

      pressBlock('block-1');
      // block-2 occupies stage-2 20:00-21:30
      enterSlot('stage-2', '20:30');

      expect(screen.getByTestId('timeline-slot-stage-2-20:30')).toHaveClass('timeline-slot--warning');
      expect(screen.getByTestId('timeline-slot-stage-2-20:30')).not.toHaveClass('timeline-slot--valid');
      expect(screen.getByText(/Overlaps with/i)).toBeInTheDocument();
    });

    it('does not flag overlapping clock times on a different stage as invalid', () => {
      renderGrid();

      pressBlock('block-1');
      // block-2 occupies stage-2 20:00-21:30; targeting stage-1 at the same clock time is fine.
      enterSlot('stage-1', '20:00');

      expect(screen.getByTestId('timeline-slot-stage-1-20:00')).toHaveClass('timeline-slot--valid');
      expect(screen.queryByText(/Overlaps with/i)).not.toBeInTheDocument();
    });

    it('still attempts the save for a client-flagged conflict — the server is the authority', async () => {
      // research.md D3: the client-side overlap check only drives the live preview; the actual
      // accept/refuse decision is always left to the server's same-stage overlap check.
      const { onBlockPlacementChange } = renderGrid();

      pressBlock('block-1');
      enterSlot('stage-2', '20:30');
      release();

      await waitFor(() => {
        expect(onBlockPlacementChange).toHaveBeenCalledWith(
          expect.objectContaining({ blockId: 'block-1', stageZoneId: 'stage-2', startTime: '20:30' }),
        );
      });
    });
  });

  // --- Unrelated interactions preserved -------------------------------------

  it('distinguishes held from confirmed appearances by label and class, not color alone', () => {
    renderGrid();

    const held = screen.getByTestId('timeline-block-block-1');
    const confirmed = screen.getByTestId('timeline-block-block-2');

    expect(held).toHaveAttribute('data-booking-status', 'HOLD');
    expect(held).toHaveClass('timeline-block-card--booking-hold');
    expect(screen.getByTestId('timeline-block-booking-block-1')).toHaveTextContent('Hold');
    expect(screen.getByTestId('timeline-block-booking-block-1')).toHaveClass(
      'festival-booking-status--hold',
    );

    expect(confirmed).toHaveAttribute('data-booking-status', 'CONFIRMED');
    expect(confirmed).toHaveClass('timeline-block-card--booking-confirmed');
    expect(screen.getByTestId('timeline-block-booking-block-2')).toHaveTextContent('Confirmed');
    expect(screen.getByTestId('timeline-block-booking-block-2')).toHaveClass(
      'festival-booking-status--confirmed',
    );
  });

  it('toggles booking status without opening the block editor or starting a drag', async () => {
    const onBookingStatusChange = vi.fn().mockResolvedValue(undefined);
    const { onBlockClick, onBlockPlacementChange } = renderGrid({ onBookingStatusChange });

    await userEvent.click(screen.getByTestId('timeline-block-booking-block-1'));
    expect(onBookingStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'block-1' }),
      'CONFIRMED',
    );

    await userEvent.click(screen.getByTestId('timeline-block-booking-block-2'));
    expect(onBookingStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'block-2' }),
      'HOLD',
    );

    release();
    expect(onBlockClick).not.toHaveBeenCalled();
    expect(onBlockPlacementChange).not.toHaveBeenCalled();
  });

  it('renders booking status read-only for viewers who cannot manage the schedule', () => {
    renderGrid({ canManage: false, onBookingStatusChange: vi.fn() });

    const badge = screen.getByTestId('timeline-block-booking-block-1');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveTextContent('Hold');
  });

  it('omits the booking badge for public blocks that carry no booking status', () => {
    renderGrid({}, [{ ...dayOneBlocks[0], bookingStatus: undefined }]);

    expect(screen.queryByTestId('timeline-block-booking-block-1')).not.toBeInTheDocument();
  });

  it('pins a performance without opening the block editor or starting a drag', async () => {
    const onPinToggle = vi.fn();
    const { onBlockClick, onBlockPlacementChange } = renderGrid({ onPinToggle });

    await userEvent.click(screen.getByTestId('timeline-block-pin-block-1'));

    expect(onPinToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'block-1' }));
    release();
    expect(onBlockClick).not.toHaveBeenCalled();
    expect(onBlockPlacementChange).not.toHaveBeenCalled();
  });

  it('does not render resize edge handles for viewers who cannot manage the schedule', () => {
    renderGrid({ canManage: false });

    expect(screen.queryByTestId('timeline-block-resize-start-block-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-block-resize-end-block-1')).not.toBeInTheDocument();
  });
});
