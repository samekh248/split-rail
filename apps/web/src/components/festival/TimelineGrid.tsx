import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faClock,
  faGripVertical,
  faHourglassHalf,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { PinToggleButton } from '@/components/PinToggleButton';
import { isBlockConflictError, parseBlockConflictError } from '@/components/festival/conflictTypes';
import {
  blockDurationMinutes,
  blockGridStyle,
  buildTimeSlots,
  detectSameStageOverlap,
  formatDaySwitcherLabel,
  minutesToTime,
  timeToMinutes,
} from '@/components/festival/timelineUtils';
import {
  bookingStatusClass,
  bookingStatusLabel,
  normalizeBookingStatus,
  toggledBookingStatus,
  type FestivalBookingStatus,
} from '@/lib/festivalBookingStatus';
import type {
  FestivalDayDto,
  ProgrammingBlockResponse,
  StageZoneResponse,
} from '@/types/generated-api';

export interface BlockMoveTarget {
  blockId: string;
  dayDate: string;
  stageZoneId: string;
  startTime: string;
  endTime: string;
}

export interface TimelineGridProps {
  venueId: string;
  eventId: string;
  days: FestivalDayDto[];
  stages: StageZoneResponse[];
  blocks: ProgrammingBlockResponse[];
  selectedDay: string;
  onDayChange: (dayDate: string) => void;
  onBlockClick?: (block: ProgrammingBlockResponse) => void;
  onBlockMove: (target: BlockMoveTarget) => Promise<void>;
  onConflict: (conflict: ReturnType<typeof parseBlockConflictError>, block: ProgrammingBlockResponse) => void;
  /** Promotes a held appearance to confirmed, or demotes a confirmed one back to a hold. */
  onBookingStatusChange?: (
    block: ProgrammingBlockResponse,
    bookingStatus: FestivalBookingStatus,
  ) => void | Promise<void>;
  onPinToggle?: (block: ProgrammingBlockResponse) => void;
  canManage?: boolean;
}

interface DraggedBlock {
  block: ProgrammingBlockResponse;
  originStageId: string;
  originStartTime: string;
}

interface HoverTarget {
  stageZoneId: string;
  startTime: string;
}

function categoryClass(category: string | null | undefined): string {
  return `timeline-block-card--${(category ?? 'music').toLowerCase()}`;
}

function statusBadge(status: string | null | undefined): string {
  switch (status) {
    case 'DELAYED':
      return 'Delayed';
    case 'PARTIALLY_COMPLETED':
      return 'Partial';
    case 'CANCELED':
      return 'Canceled';
    default:
      return 'Scheduled';
  }
}

interface BookingStatusChipProps {
  blockId: string;
  bookingStatus: FestivalBookingStatus;
  disabled: boolean;
  /** Omitted for read-only viewers, which renders a plain badge instead of a toggle. */
  onChange?: (next: FestivalBookingStatus) => void;
}

function BookingStatusChip({
  blockId,
  bookingStatus,
  disabled,
  onChange,
}: BookingStatusChipProps) {
  const className = `timeline-block-card__booking festival-booking-status ${bookingStatusClass(bookingStatus)}`;
  const icon = bookingStatus === 'CONFIRMED' ? faCircleCheck : faHourglassHalf;
  const label = bookingStatusLabel(bookingStatus);

  if (!onChange) {
    return (
      <span className={className} data-testid={`timeline-block-booking-${blockId}`}>
        <FontAwesomeIcon icon={icon} aria-hidden="true" />
        {label}
      </span>
    );
  }

  const next = toggledBookingStatus(bookingStatus);

  return (
    <button
      type="button"
      className={className}
      data-testid={`timeline-block-booking-${blockId}`}
      aria-label={`${label} — set to ${bookingStatusLabel(next)}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onChange(next);
      }}
    >
      <FontAwesomeIcon icon={icon} aria-hidden="true" />
      {label}
    </button>
  );
}

export function TimelineGrid({
  days,
  stages,
  blocks,
  selectedDay,
  onDayChange,
  onBlockClick,
  onBlockMove,
  onConflict,
  onBookingStatusChange,
  onPinToggle,
  canManage = false,
}: TimelineGridProps) {
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const [draggedBlock, setDraggedBlock] = useState<DraggedBlock | null>(null);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  const dayBlocks = useMemo(
    () => blocks.filter((block) => block.dayDate === selectedDay),
    [blocks, selectedDay],
  );

  const overlapWarning = useMemo(() => {
    if (!draggedBlock || !hoverTarget) {
      return null;
    }
    const duration = blockDurationMinutes(draggedBlock.block);
    const endTime = minutesToTime(timeToMinutes(hoverTarget.startTime) + duration);
    return detectSameStageOverlap(dayBlocks, {
      id: draggedBlock.block.id,
      stageZoneId: hoverTarget.stageZoneId,
      dayDate: selectedDay,
      startTime: hoverTarget.startTime,
      endTime,
    });
  }, [dayBlocks, draggedBlock, hoverTarget, selectedDay]);

  const handleDragStart = useCallback(
    (block: ProgrammingBlockResponse) => (event: React.DragEvent<HTMLSpanElement>) => {
      if (!canManage || pendingBlockId) {
        event.preventDefault();
        return;
      }
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
      setDraggedBlock({
        block,
        originStageId: block.stageZoneId ?? '',
        originStartTime: block.startTime ?? '',
      });
    },
    [canManage, pendingBlockId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedBlock(null);
    setHoverTarget(null);
  }, []);

  const handleDragOver =
    (stageZoneId: string, startTime: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!draggedBlock) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setHoverTarget({ stageZoneId, startTime });
    };

  const handleDrop =
    (stageZoneId: string, startTime: string) => async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!draggedBlock?.block.id) {
        handleDragEnd();
        return;
      }

      const duration = blockDurationMinutes(draggedBlock.block);
      const endTime = minutesToTime(timeToMinutes(startTime) + duration);
      const blockId = draggedBlock.block.id;
      const moveTarget: BlockMoveTarget = {
        blockId,
        dayDate: selectedDay,
        stageZoneId,
        startTime,
        endTime,
      };

      const movingBlock = draggedBlock.block;
      setHoverTarget(null);
      setDraggedBlock(null);
      setPendingBlockId(blockId);

      try {
        await onBlockMove(moveTarget);
      } catch (error) {
        if (isBlockConflictError(error)) {
          onConflict(parseBlockConflictError(error), movingBlock);
        }
      } finally {
        setPendingBlockId(null);
      }
    };

  const columnTemplate = `var(--timeline-time-col) repeat(${Math.max(stages.length, 1)}, minmax(11rem, 1fr))`;
  const boardStyle = {
    '--timeline-slot-count': String(timeSlots.length),
    gridTemplateColumns: columnTemplate,
  } as CSSProperties;

  return (
    <section className="timeline-grid" data-testid="timeline-grid" role="grid" aria-label="Festival timeline">
      <div className="timeline-day-switcher" data-testid="timeline-day-switcher" role="group" aria-label="Festival day">
        {days.map((day) => {
          const dayDate = day.dayDate ?? '';
          const label = formatDaySwitcherLabel(dayDate);
          const selected = dayDate === selectedDay;
          return (
            <button
              key={dayDate}
              type="button"
              className={`timeline-day-switcher__btn${selected ? ' timeline-day-switcher__btn--active' : ''}`}
              aria-pressed={selected}
              data-testid={`timeline-day-${dayDate}`}
              onClick={() => onDayChange(dayDate)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="timeline-grid__scroll">
        <div className="timeline-grid__header" style={boardStyle}>
          <div className="timeline-grid__corner" aria-hidden="true" />
          {stages.map((stage) => (
            <div key={stage.id ?? stage.name} className="timeline-grid__stage-label">
              {stage.name}
            </div>
          ))}
        </div>

        <div className="timeline-grid__body" style={boardStyle}>
          <div className="timeline-grid__times" data-testid="timeline-time-header">
            {timeSlots.map((slot) => (
              <div key={slot} className="timeline-grid__time-label">
                <FontAwesomeIcon icon={faClock} aria-hidden="true" />
                {slot}
              </div>
            ))}
          </div>

          {stages.map((stage) => {
            const stageId = stage.id ?? '';
            const stageBlocks = dayBlocks.filter((block) => block.stageZoneId === stageId);

            return (
              <div
                key={stageId}
                className="timeline-stage-column"
                data-testid={`timeline-stage-row-${stageId}`}
              >
                <div className="timeline-stage-column__slots">
                  {timeSlots.map((slot) => {
                    const isHover =
                      hoverTarget?.stageZoneId === stageId && hoverTarget.startTime === slot;
                    const slotClasses = [
                      'timeline-slot',
                      isHover ? 'timeline-slot--hover' : '',
                      isHover && overlapWarning ? 'timeline-slot--warning' : '',
                      isHover && !overlapWarning ? 'timeline-slot--valid' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={`${stageId}-${slot}`}
                        className={slotClasses}
                        data-testid={`timeline-slot-${stageId}-${slot}`}
                        onDragOver={canManage ? handleDragOver(stageId, slot) : undefined}
                        onDrop={canManage ? handleDrop(stageId, slot) : undefined}
                      />
                    );
                  })}
                </div>

                {stageBlocks.map((block) => {
                  const style = blockGridStyle(block);
                  const isPending = pendingBlockId === block.id;
                  const isDragging = draggedBlock?.block.id === block.id;
                  const bookingStatus = block.bookingStatus
                    ? normalizeBookingStatus(block.bookingStatus)
                    : null;

                  return (
                    <article
                      key={block.id}
                      className={`timeline-block-card ${categoryClass(block.category)} timeline-block-card--${(block.scheduleStatus ?? 'scheduled').toLowerCase()}${bookingStatus ? ` timeline-block-card--booking-${bookingStatus.toLowerCase()}` : ''}${block.isPinned ? ' timeline-block-card--pinned' : ''}${isPending ? ' timeline-block-card--pending' : ''}${isDragging ? ' timeline-block-card--dragging' : ''}`}
                      style={style}
                      data-testid={`timeline-block-${block.id}`}
                      data-stage-id={block.stageZoneId}
                      data-start-time={block.startTime}
                      data-end-time={block.endTime}
                      data-category={block.category}
                      data-schedule-status={block.scheduleStatus}
                      data-booking-status={bookingStatus ?? undefined}
                      onClick={() => onBlockClick?.(block)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onBlockClick?.(block);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${block.title}, ${block.startTime} to ${block.endTime}${bookingStatus ? `, ${bookingStatusLabel(bookingStatus)}` : ''}`}
                    >
                      {canManage ? (
                        <span
                          className="timeline-block-card__handle"
                          role="presentation"
                          draggable={!isPending}
                          onDragStart={handleDragStart(block)}
                          onDragEnd={handleDragEnd}
                          data-testid={`timeline-block-drag-handle-${block.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <FontAwesomeIcon icon={faGripVertical} aria-hidden="true" />
                        </span>
                      ) : null}
                      {onPinToggle && block.id ? (
                        <PinToggleButton
                          className="timeline-block-card__pin event-card__pin"
                          pinned={block.isPinned === true}
                          pinnedLabel="Unpin performance"
                          unpinnedLabel="Pin performance"
                          testId={`timeline-block-pin-${block.id}`}
                          onToggle={() => onPinToggle(block)}
                        />
                      ) : null}
                      <span className="timeline-block-card__title">{block.title}</span>
                      <span className="timeline-block-card__time">
                        {block.startTime}–{block.endTime}
                      </span>
                      <span className="timeline-block-card__status">{statusBadge(block.scheduleStatus)}</span>
                      {bookingStatus ? (
                        <BookingStatusChip
                          blockId={block.id ?? ''}
                          bookingStatus={bookingStatus}
                          disabled={isPending}
                          onChange={
                            canManage && onBookingStatusChange
                              ? (next) => void onBookingStatusChange(block, next)
                              : undefined
                          }
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {overlapWarning ? (
        <p className="timeline-grid__overlap-warning" role="status">
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
          Overlaps with &ldquo;{overlapWarning.title}&rdquo; on this stage — server will confirm.
        </p>
      ) : null}
    </section>
  );
}
