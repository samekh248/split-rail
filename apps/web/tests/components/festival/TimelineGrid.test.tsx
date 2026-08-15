import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineGrid } from '@/components/festival/TimelineGrid';
import type { ProgrammingBlockResponse } from '@/types/generated-api';

const mockUpdateBlock = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/festivals', () => ({
  useUpdateBlock: () => mockUpdateBlock,
}));

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
    stageName: 'Main Stage',
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
  const onBlockMove = vi.fn().mockResolvedValue(undefined);

  const view = render(
    <TimelineGrid
      venueId="venue-1"
      eventId="event-1"
      days={days}
      stages={stages}
      blocks={blocks}
      selectedDay="2026-08-14"
      onDayChange={vi.fn()}
      onBlockMove={onBlockMove}
      onConflict={onConflict}
      canManage
      {...overrides}
    />,
    { wrapper: Wrapper },
  );

  return { ...view, onConflict, onBlockMove };
}

describe('TimelineGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateBlock.mutateAsync.mockResolvedValue({
      id: 'block-1',
      title: 'Opening Act',
      warnings: [],
    });
  });

  it('renders time columns and stage rows with blocks positioned on the selected day', () => {
    renderGrid();

    expect(screen.getByTestId('timeline-grid')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-time-header')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-row-stage-1')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-stage-row-stage-2')).toBeInTheDocument();

    const openingAct = screen.getByTestId('timeline-block-block-1');
    expect(openingAct).toHaveTextContent('Opening Act');
    expect(openingAct).toHaveAttribute('data-stage-id', 'stage-1');
    expect(openingAct).toHaveAttribute('data-start-time', '14:00');

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
        onBlockMove={vi.fn()}
        onConflict={vi.fn()}
        canManage
      />,
    );

    expect(screen.getByTestId('timeline-block-block-3')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-block-block-1')).not.toBeInTheDocument();
  });

  it('fires block-update with target day, stage, and time after drag-and-drop', async () => {
    const { onBlockMove } = renderGrid();

    fireEvent.dragStart(screen.getByTestId('timeline-block-drag-handle-block-1'));
    fireEvent.dragOver(screen.getByTestId('timeline-slot-stage-2-16:00'));
    fireEvent.drop(screen.getByTestId('timeline-slot-stage-2-16:00'));

    await waitFor(() => {
      expect(onBlockMove).toHaveBeenCalledWith({
        blockId: 'block-1',
        dayDate: '2026-08-14',
        stageZoneId: 'stage-2',
        startTime: '16:00',
        endTime: '17:00',
      });
    });
  });

  it('keeps the block in its original slot when move fails with 409 and reports the conflict', async () => {
    const onConflict = vi.fn();
    const onBlockMove = vi.fn().mockRejectedValue(new Error("409: 'Headliner' already occupies this stage from 20:00 to 21:30."));

    render(
      <TimelineGrid
        venueId="venue-1"
        eventId="event-1"
        days={days}
        stages={stages}
        blocks={dayOneBlocks}
        selectedDay="2026-08-14"
        onDayChange={vi.fn()}
        onBlockMove={onBlockMove}
        onConflict={onConflict}
        canManage
      />,
      { wrapper: Wrapper },
    );

    const openingAct = screen.getByTestId('timeline-block-block-1');
    expect(openingAct).toHaveAttribute('data-stage-id', 'stage-1');
    expect(openingAct).toHaveAttribute('data-start-time', '14:00');

    fireEvent.dragStart(screen.getByTestId('timeline-block-drag-handle-block-1'));
    fireEvent.dragOver(screen.getByTestId('timeline-slot-stage-1-20:00'));
    fireEvent.drop(screen.getByTestId('timeline-slot-stage-1-20:00'));

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

  it('exposes grid semantics and category/status text beyond color alone', () => {
    renderGrid();

    expect(screen.getByRole('grid', { name: /festival timeline/i })).toBeInTheDocument();
    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-category', 'MUSIC');
    expect(screen.getByTestId('timeline-block-block-1')).toHaveAttribute('data-schedule-status', 'SCHEDULED');
  });

  it('distinguishes held from confirmed appearances by label and class, not color alone', () => {
    renderGrid({ onBookingStatusChange: vi.fn() });

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

  it('toggles booking status without opening the block editor', async () => {
    const onBookingStatusChange = vi.fn().mockResolvedValue(undefined);
    const onBlockClick = vi.fn();
    renderGrid({ onBookingStatusChange, onBlockClick });

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

    expect(onBlockClick).not.toHaveBeenCalled();
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
});
