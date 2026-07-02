import { useEffect, useId, useRef, useState } from 'react';
import {
  EVENT_CARD_PROGRESS_MILESTONES,
  getEventCardProgressAriaLabel,
  getEventCardProgressFillGradient,
  getEventCardProgressLabel,
  getMilestoneBarColor,
  getMilestoneBubbleState,
  resolveEventCardProgressPosition,
  type EventCardProgressMilestone,
} from '@/lib/eventCardProgress';

export interface EventCardProgressBarProps {
  eventId: string;
  bookingPlacementStatus?: string | null;
  eventDate?: string | null;
  compact?: boolean;
  now?: Date;
}

export function EventCardProgressBar({
  eventId,
  bookingPlacementStatus,
  eventDate,
  compact = false,
  now,
}: EventCardProgressBarProps) {
  const position = resolveEventCardProgressPosition(bookingPlacementStatus, eventDate, now);
  const [openTooltipId, setOpenTooltipId] = useState<EventCardProgressMilestone | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (openTooltipId == null) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenTooltipId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openTooltipId]);

  const rootClassName = [
    'event-card__progress',
    compact ? 'event-card__progress--compact' : '',
    position.isCancelled ? 'event-card__progress--cancelled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggleTooltip = (milestone: EventCardProgressMilestone) => {
    setOpenTooltipId((current) => (current === milestone ? null : milestone));
  };

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      role="progressbar"
      aria-valuenow={position.fillPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={getEventCardProgressAriaLabel(position)}
      data-testid={`event-card-progress-${eventId}`}
    >
      <div className="event-card__progress-track">
        <div className="event-card__progress-rail">
          <div
            className="event-card__progress-fill"
            style={{
              width: `${position.fillPercent}%`,
              background: getEventCardProgressFillGradient(),
            }}
          />
        </div>
        <ol className="event-card__progress-milestones">
          {EVENT_CARD_PROGRESS_MILESTONES.map((milestone, index) => {
            const bubbleState = getMilestoneBubbleState(milestone, position);
            const isTooltipOpen = openTooltipId === milestone;
            const milestoneOffset = index * (100 / (EVENT_CARD_PROGRESS_MILESTONES.length - 1));
            const bubbleTone =
              bubbleState === 'completed' || bubbleState === 'active'
                ? getMilestoneBarColor(milestone)
                : undefined;

            return (
              <li
                key={milestone}
                className="event-card__progress-milestone"
                style={{ left: `${milestoneOffset}%` }}
              >
                <button
                  type="button"
                  className={[
                    'event-card__progress-bubble',
                    `event-card__progress-bubble--${bubbleState}`,
                  ].join(' ')}
                  style={bubbleTone ? { background: bubbleTone } : undefined}
                  aria-label={getEventCardProgressLabel(milestone)}
                  aria-describedby={isTooltipOpen ? `${tooltipId}-${milestone}` : undefined}
                  data-testid={`event-card-progress-bubble-${milestone}-${eventId}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleTooltip(milestone);
                  }}
                  onMouseEnter={() => setOpenTooltipId(milestone)}
                  onMouseLeave={() => setOpenTooltipId(null)}
                  onFocus={() => setOpenTooltipId(milestone)}
                  onBlur={() => setOpenTooltipId(null)}
                />
                {isTooltipOpen && (
                  <span
                    id={`${tooltipId}-${milestone}`}
                    role="tooltip"
                    className="event-card__progress-tooltip"
                    data-testid={`event-card-progress-tooltip-${milestone}-${eventId}`}
                  >
                    {getEventCardProgressLabel(milestone)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
