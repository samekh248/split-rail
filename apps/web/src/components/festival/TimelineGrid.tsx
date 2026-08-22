import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faClock,
  faHourglassHalf,
  faSpinner,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { PinToggleButton } from '@/components/PinToggleButton';
import { isBlockConflictError, parseBlockConflictError } from '@/components/festival/conflictTypes';
import {
  formatTimeRangeWithPreference,
  formatTimeRangeWithWord,
  formatTimeWithPreference,
} from '@/lib/timeDisplayFormat';
import {
  blockCardDensity,
  blockGridStyle,
  buildTimeSlots,
  findActiveBlockAtSlot,
  formatDaySwitcherLabel,
  isSlotInGesturePreview,
  pointerMinutesInColumn,
  timeToMinutes,
} from '@/components/festival/timelineUtils';
import {
  type GestureIntent,
  type PointerUpdate,
  useTimelineInteraction,
} from '@/components/festival/useTimelineInteraction';
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

export interface BlockPlacementChange {
  kind: 'move' | 'resize';
  blockId: string;
  dayDate: string;
  stageZoneId: string;
  startTime: string;
  endTime: string;
}

export interface SlotCreateSeed {
  dayDate: string;
  stageZoneId: string;
  startTime: string;
  endTime: string;
}

/** A placement the user has committed but the server has not confirmed yet. */
interface PendingPlacement {
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
  /** Empty-slot click (no drag): opens the create form pre-seeded at that stage/start. */
  onSlotClick?: (seed: SlotCreateSeed) => void;
  onBlockPlacementChange: (change: BlockPlacementChange) => Promise<void>;
  onConflict: (conflict: ReturnType<typeof parseBlockConflictError>, block: ProgrammingBlockResponse) => void;
  /** Promotes a held appearance to confirmed, or demotes a confirmed one back to a hold. */
  onBookingStatusChange?: (
    block: ProgrammingBlockResponse,
    bookingStatus: FestivalBookingStatus,
  ) => void | Promise<void>;
  onPinToggle?: (block: ProgrammingBlockResponse) => void;
  canManage?: boolean;
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
  onSlotClick,
  onBlockPlacementChange,
  onConflict,
  onBookingStatusChange,
  onPinToggle,
  canManage = false,
}: TimelineGridProps) {
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  // Keyed by block id so independent blocks can be in flight at the same time — waiting on one
  // save should never stall a drag of a different block.
  const [pendingPlacements, setPendingPlacements] = useState<ReadonlyMap<string, PendingPlacement>>(
    () => new Map(),
  );
  const columnRefs = useRef(new Map<string, HTMLDivElement>());

  const dayBlocks = useMemo(
    () => blocks.filter((block) => block.dayDate === selectedDay),
    [blocks, selectedDay],
  );

  /**
   * The board as the user believes it to be: server data with every unconfirmed placement
   * already applied. Everything downstream — rendering, hit-testing, overlap checks — reads
   * this, so an in-flight block behaves like it already lives at its new time.
   */
  const effectiveDayBlocks = useMemo(() => {
    if (pendingPlacements.size === 0) {
      return dayBlocks;
    }
    return dayBlocks.map((block) => {
      const pending = block.id ? pendingPlacements.get(block.id) : undefined;
      return pending ? { ...block, ...pending } : block;
    });
  }, [dayBlocks, pendingPlacements]);

  const commitIntent = useCallback(
    async (intent: GestureIntent) => {
      if (intent.kind === 'click') {
        const block = effectiveDayBlocks.find((item) => item.id === intent.blockId);
        if (block) {
          onBlockClick?.(block);
        }
        return;
      }

      if (intent.kind === 'create') {
        onSlotClick?.({
          dayDate: intent.dayDate,
          stageZoneId: intent.stageZoneId,
          startTime: intent.startTime,
          endTime: intent.endTime,
        });
        return;
      }

      const block = effectiveDayBlocks.find((item) => item.id === intent.blockId);
      const blockId = block?.id;
      if (!blockId) {
        return;
      }

      const placement: PendingPlacement = {
        stageZoneId: intent.kind === 'move' ? intent.stageZoneId : (block.stageZoneId ?? ''),
        startTime: intent.startTime,
        endTime: intent.endTime,
      };

      // Commit locally first so the block stays where the user dropped it. Without this the
      // card snaps back to its saved position for the length of the round-trip, then jumps
      // forward again once the refetch lands.
      setPendingPlacements((prev) => new Map(prev).set(blockId, placement));

      try {
        await onBlockPlacementChange({
          kind: intent.kind,
          blockId,
          dayDate: selectedDay,
          ...placement,
        });
      } catch (error) {
        if (isBlockConflictError(error)) {
          onConflict(parseBlockConflictError(error), block);
        }
      } finally {
        // On success the refetch has already landed, so dropping the override is seamless.
        // On failure it rolls the card back to its last saved placement.
        setPendingPlacements((prev) => {
          if (!prev.has(blockId)) {
            return prev;
          }
          const next = new Map(prev);
          next.delete(blockId);
          return next;
        });
      }
    },
    [effectiveDayBlocks, onBlockClick, onBlockPlacementChange, onConflict, onSlotClick, selectedDay],
  );

  const { gesture, startPress, updatePointer } = useTimelineInteraction({
    dayDate: selectedDay,
    blocks: effectiveDayBlocks,
    canManage,
    onIntent: commitIntent,
  });

  const setColumnRef = useCallback(
    (stageId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        columnRefs.current.set(stageId, element);
      } else {
        columnRefs.current.delete(stageId);
      }
    },
    [],
  );

  /**
   * Maps raw pointer coordinates onto a stage column and a continuous minute value. Picks the
   * column under the pointer, or the nearest one when the pointer strays outside the board, so
   * a drag that wanders past the edge still tracks sensibly instead of freezing.
   */
  const resolvePointer = useCallback(
    (clientX: number, clientY: number): PointerUpdate | null => {
      let bestId: string | null = null;
      let bestRect: DOMRect | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const [stageId, element] of columnRefs.current) {
        const rect = element.getBoundingClientRect();
        const distance =
          clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = stageId;
          bestRect = rect;
        }
        if (distance === 0) {
          break;
        }
      }

      // An unmeasurable column (not laid out yet) would map every Y to the top of the day.
      // Returning null instead lets callers fall back to the discrete cell signal rather than
      // acting on a fabricated time.
      if (!bestId || !bestRect || bestRect.height <= 0) {
        return null;
      }

      return {
        stageZoneId: bestId,
        minutes: pointerMinutesInColumn(clientY, bestRect.top, bestRect.height),
        clientX,
        clientY,
        source: 'pointer',
      };
    },
    [],
  );

  const gestureActive = gesture !== null;

  // Continuous tracking lives on `document` rather than on the grid: the pointer routinely
  // leaves the origin element mid-drag (crossing other cards, or the board edge), and only a
  // document-level listener sees every move regardless of what is underneath.
  useEffect(() => {
    if (!gestureActive) {
      return;
    }
    const handlePointerMove = (event: PointerEvent) => {
      const resolved = resolvePointer(event.clientX, event.clientY);
      if (resolved) {
        updatePointer(resolved);
      }
    };
    document.addEventListener('pointermove', handlePointerMove);
    return () => document.removeEventListener('pointermove', handlePointerMove);
  }, [gestureActive, resolvePointer, updatePointer]);

  const handleSlotPointerDown = useCallback(
    (stageZoneId: string, slotTime: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      const covering = findActiveBlockAtSlot(effectiveDayBlocks, stageZoneId, slotTime);
      if (covering?.id) {
        if (pendingPlacements.has(covering.id)) {
          return;
        }
        const resolved = resolvePointer(event.clientX, event.clientY);
        startPress({
          kind: 'block',
          blockId: covering.id,
          stageZoneId: covering.stageZoneId ?? '',
          startTime: covering.startTime ?? '',
          endTime: covering.endTime ?? '',
          clientX: event.clientX,
          clientY: event.clientY,
          pointerMinutes: resolved?.minutes,
        });
        return;
      }
      startPress({
        kind: 'slot',
        stageZoneId,
        startTime: slotTime,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    [effectiveDayBlocks, pendingPlacements, resolvePointer, startPress],
  );

  const handleSlotPointerEnter = useCallback(
    (stageZoneId: string, slotTime: string) => () => {
      updatePointer({ stageZoneId, minutes: timeToMinutes(slotTime), source: 'cell' });
    },
    [updatePointer],
  );

  const handleBlockPointerDown = useCallback(
    (block: ProgrammingBlockResponse) => (event: React.PointerEvent<HTMLElement>) => {
      if (!block.id || pendingPlacements.has(block.id)) {
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('button')) {
        return;
      }
      const resolved = resolvePointer(event.clientX, event.clientY);
      startPress({
        kind: 'block',
        blockId: block.id,
        stageZoneId: block.stageZoneId ?? '',
        startTime: block.startTime ?? '',
        endTime: block.endTime ?? '',
        clientX: event.clientX,
        clientY: event.clientY,
        pointerMinutes: resolved?.minutes,
      });
    },
    [pendingPlacements, resolvePointer, startPress],
  );

  const handleEdgePointerDown = useCallback(
    (block: ProgrammingBlockResponse, edge: 'start' | 'end') =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (!block.id || pendingPlacements.has(block.id)) {
          return;
        }
        startPress({
          kind: 'edge',
          blockId: block.id,
          edge,
          stageZoneId: block.stageZoneId ?? '',
          startTime: block.startTime ?? '',
          endTime: block.endTime ?? '',
          clientX: event.clientX,
          clientY: event.clientY,
        });
      },
    [pendingPlacements, startPress],
  );

  const isDragging = gesture !== null && gesture.phase !== 'pressing';
  const isCreating = gesture?.phase === 'creating';
  const previewBlockId = isDragging ? gesture.origin.blockId : null;
  const previewRange = isDragging
    ? {
        stageZoneId: gesture.currentStageId,
        startTime: gesture.currentStartTime,
        endTime: gesture.currentEndTime,
      }
    : null;
  const previewValid = gesture?.isValid ?? true;
  const conflictBlock =
    gesture?.conflictBlockId != null
      ? (effectiveDayBlocks.find((block) => block.id === gesture.conflictBlockId) ?? null)
      : null;

  /** Where a block renders right now: live gesture preview first, else its effective placement. */
  const displayPlacementFor = useCallback(
    (block: ProgrammingBlockResponse): PendingPlacement => {
      if (block.id != null && block.id === previewBlockId && previewRange) {
        return previewRange;
      }
      return {
        stageZoneId: block.stageZoneId ?? '',
        startTime: block.startTime ?? '',
        endTime: block.endTime ?? '',
      };
    },
    [previewBlockId, previewRange],
  );

  const columnTemplate = `var(--timeline-time-col) repeat(${Math.max(stages.length, 1)}, minmax(11rem, 1fr))`;
  const boardStyle = {
    '--timeline-slot-count': String(timeSlots.length),
    gridTemplateColumns: columnTemplate,
  } as CSSProperties;

  return (
    <section
      className="timeline-grid"
      data-testid="timeline-grid"
      role="grid"
      aria-label="Festival timeline"
      data-gesturing={gesture !== null ? 'true' : undefined}
    >
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
                {formatTimeWithPreference(slot)}
              </div>
            ))}
          </div>

          {stages.map((stage) => {
            const stageId = stage.id ?? '';
            // A block renders in its DISPLAY column — the drag preview's, or the unconfirmed
            // one — so both a live drag and an in-flight save visibly keep the card where the
            // user put it.
            const stageBlocks = effectiveDayBlocks.filter(
              (block) => displayPlacementFor(block).stageZoneId === stageId,
            );

            return (
              <div
                key={stageId}
                ref={setColumnRef(stageId)}
                className="timeline-stage-column"
                data-testid={`timeline-stage-row-${stageId}`}
              >
                <div className="timeline-stage-column__slots">
                  {timeSlots.map((slot) => {
                    const inPreview = isSlotInGesturePreview(previewRange, stageId, slot);
                    const slotClasses = [
                      'timeline-slot',
                      inPreview ? 'timeline-slot--hover' : '',
                      inPreview && !previewValid ? 'timeline-slot--warning' : '',
                      inPreview && previewValid ? 'timeline-slot--valid' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={`${stageId}-${slot}`}
                        className={slotClasses}
                        data-testid={`timeline-slot-${stageId}-${slot}`}
                        onPointerDown={canManage ? handleSlotPointerDown(stageId, slot) : undefined}
                        onPointerEnter={canManage ? handleSlotPointerEnter(stageId, slot) : undefined}
                      />
                    );
                  })}
                </div>

                {isCreating && previewRange!.stageZoneId === stageId ? (
                  <article
                    className={`timeline-block-card timeline-block-card--draft${previewValid ? '' : ' timeline-block-card--invalid'}`}
                    style={blockGridStyle({
                      startTime: previewRange!.startTime,
                      endTime: previewRange!.endTime,
                    })}
                    data-testid="timeline-draft-block"
                    data-start-time={previewRange!.startTime}
                    data-end-time={previewRange!.endTime}
                    aria-hidden="true"
                  >
                    <span className="timeline-block-card__title">New block</span>
                    <span className="timeline-block-card__time">
                      {formatTimeRangeWithPreference(previewRange!.startTime, previewRange!.endTime)}
                    </span>
                  </article>
                ) : null}

                {stageBlocks.map((block) => {
                  const display = displayPlacementFor(block);
                  const isPreviewBlock = block.id != null && block.id === previewBlockId;
                  const style = blockGridStyle({
                    ...block,
                    startTime: display.startTime,
                    endTime: display.endTime,
                  });
                  const isSyncing = block.id != null && pendingPlacements.has(block.id);
                  const isGesturing = gesture != null && gesture.origin.blockId === block.id;
                  const bookingStatus = block.bookingStatus
                    ? normalizeBookingStatus(block.bookingStatus)
                    : null;
                  // Short cards only have room for the act name, so everything else drops away
                  // as the block shrinks rather than crowding the name out.
                  const density = blockCardDensity(display.startTime, display.endTime);
                  const showTime = density !== 'compact';
                  // "Scheduled" is the default and least informative line, so it is the first
                  // to go; the pin and booking chip survive down to the one-slot card.
                  const showStatus = density === 'full';
                  const showChrome = density !== 'compact';

                  return (
                    <article
                      key={block.id}
                      className={`timeline-block-card ${categoryClass(block.category)} timeline-block-card--${(block.scheduleStatus ?? 'scheduled').toLowerCase()}${bookingStatus ? ` timeline-block-card--booking-${bookingStatus.toLowerCase()}` : ''}${block.isPinned ? ' timeline-block-card--pinned' : ''} timeline-block-card--${density}${isSyncing ? ' timeline-block-card--syncing' : ''}${isGesturing ? ' timeline-block-card--gesturing' : ''}${isPreviewBlock ? ' timeline-block-card--dragging' : ''}${isPreviewBlock && !previewValid ? ' timeline-block-card--invalid' : ''}${canManage ? ' timeline-block-card--manageable' : ''}`}
                      style={style}
                      data-testid={`timeline-block-${block.id}`}
                      data-stage-id={display.stageZoneId}
                      data-start-time={display.startTime}
                      data-end-time={display.endTime}
                      data-category={block.category}
                      data-schedule-status={block.scheduleStatus}
                      data-booking-status={bookingStatus ?? undefined}
                      data-density={density}
                      data-syncing={isSyncing ? 'true' : undefined}
                      onPointerDown={canManage ? handleBlockPointerDown(block) : undefined}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onBlockClick?.(block);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${block.title}, ${formatTimeRangeWithWord(display.startTime, display.endTime)}${bookingStatus ? `, ${bookingStatusLabel(bookingStatus)}` : ''}${isSyncing ? ', saving' : ''}`}
                    >
                      {canManage && !isSyncing ? (
                        <>
                          <div
                            className="timeline-block-card__edge timeline-block-card__edge--start"
                            role="presentation"
                            data-testid={`timeline-block-resize-start-${block.id}`}
                            onPointerDown={handleEdgePointerDown(block, 'start')}
                          />
                          <div
                            className="timeline-block-card__edge timeline-block-card__edge--end"
                            role="presentation"
                            data-testid={`timeline-block-resize-end-${block.id}`}
                            onPointerDown={handleEdgePointerDown(block, 'end')}
                          />
                        </>
                      ) : null}
                      {isSyncing ? (
                        <span
                          className="timeline-block-card__sync"
                          role="status"
                          aria-label="Saving"
                          title="Saving…"
                          data-testid={`timeline-block-sync-${block.id}`}
                        >
                          <FontAwesomeIcon icon={faSpinner} spin aria-hidden="true" />
                        </span>
                      ) : null}
                      {onPinToggle && block.id && showChrome ? (
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
                      {showTime ? (
                        <span className="timeline-block-card__time">
                          {formatTimeRangeWithPreference(display.startTime, display.endTime)}
                        </span>
                      ) : null}
                      {showStatus ? (
                        <span className="timeline-block-card__status">
                          {statusBadge(block.scheduleStatus)}
                        </span>
                      ) : null}
                      {bookingStatus && showChrome ? (
                        <BookingStatusChip
                          blockId={block.id ?? ''}
                          bookingStatus={bookingStatus}
                          disabled={isSyncing}
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

      {previewRange && !previewValid && conflictBlock ? (
        <p className="timeline-grid__overlap-warning" role="status">
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
          Overlaps with &ldquo;{conflictBlock.title}&rdquo; on this stage — server will confirm.
        </p>
      ) : null}
    </section>
  );
}
