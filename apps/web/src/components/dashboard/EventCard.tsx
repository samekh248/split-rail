import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';
import { deriveBottleneckAlerts, deriveLifecyclePhase } from '@/lib/eventLifecycle';
import {
  deriveBottleneckAlertsFromSummary,
  mergeBottleneckAlerts,
} from '@/lib/eventCardSummary';
import { BOOKING_PREVIEW_TOOLTIP, eventCardBookingBadgeClass, getBookingStatusLabel } from '@/lib/eventCardLabels';
import type { BookingPlacementStatus } from '@/lib/bookingCalendar';
import { resolveEventCardQuickLinks, type WorkspaceFocus } from '@/lib/eventCardQuickLinks';
import { eventHasNegativeVariance } from '@/lib/eventCardVariance';
import type { EventCardDto, EventResponse, LineItemDto, PermissionsDto } from '@/types/generated-api';
import { EventCardProgressBar } from '@/components/dashboard/EventCardProgressBar';
import { EventCardBadgeList, type EventCardTag } from '@/components/dashboard/EventCardBadgeList';

export type { WorkspaceFocus };

export type EventCardEvent = EventResponse | EventCardDto;

export interface EventCardProps {
  event: EventCardEvent;
  permissions: PermissionsDto;
  onQuickLink: (venueId: string, eventId: string, focus?: WorkspaceFocus) => void;
  lineItems?: LineItemDto[];
  isPinned?: boolean;
  onPinToggle?: () => void;
  onActivate?: () => void;
  compact?: boolean;
  showProgressBar?: boolean;
}

function isEventCardDto(event: EventCardEvent): event is EventCardDto {
  return 'hasVarianceConcern' in event || 'unmappedCount' in event || 'isPinned' in event;
}

function formatEventDate(eventDate: string | null | undefined): string {
  if (!eventDate) {
    return 'Date TBD';
  }
  const [year, month, day] = eventDate.split('-').map(Number);
  if (!year || !month || !day) {
    return 'Date TBD';
  }
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function EventCard({
  event,
  permissions,
  onQuickLink,
  lineItems,
  isPinned,
  onPinToggle,
  onActivate,
  compact = false,
  showProgressBar = false,
}: EventCardProps) {
  const eventId = event.eventId ?? 'unknown';
  const venueId = event.venueId ?? '';
  const title = event.title?.trim() || 'Untitled event';
  const phase = deriveLifecyclePhase(event);
  const summaryAlerts = isEventCardDto(event) ? deriveBottleneckAlertsFromSummary(event) : [];
  const bottleneckAlerts = mergeBottleneckAlerts(summaryAlerts, deriveBottleneckAlerts(event));
  const quickLinks = resolveEventCardQuickLinks(phase, permissions, bottleneckAlerts);
  const showsVarianceLink = quickLinks.some((link) => link.testId === 'variance');
  const showVariance =
    !showsVarianceLink
    && ((isEventCardDto(event) && event.hasVarianceConcern === true)
      || (lineItems != null && eventHasNegativeVariance(lineItems)));
  const pinnedState = isPinned ?? (isEventCardDto(event) ? event.isPinned === true : false);
  const bookingStatus =
    'bookingPlacementStatus' in event ? event.bookingPlacementStatus : null;
  const bookingLabel = getBookingStatusLabel(bookingStatus, event.eventId);
  const bookingBadgeClass = eventCardBookingBadgeClass(
    (bookingStatus ?? 'CONFIRMED') as BookingPlacementStatus,
  );

  const quickLinksNav = quickLinks.length > 0 ? (
    <nav className="event-card__quick-links" aria-label="Event actions">
      {quickLinks.map((link) => (
        <button
          key={link.testId}
          type="button"
          className="event-card__quick-link"
          data-testid={`event-card-link-${link.testId}-${eventId}`}
          onClick={() => {
            if (venueId && event.eventId) {
              onQuickLink(venueId, event.eventId, link.focus);
            }
          }}
        >
          {link.label}
        </button>
      ))}
    </nav>
  ) : null;

  const tags: EventCardTag[] = [
    {
      key: 'booking',
      label: bookingLabel,
      testId: `event-card-booking-${eventId}`,
      className: ['event-card__booking-badge', bookingBadgeClass].join(' '),
      title: BOOKING_PREVIEW_TOOLTIP,
    },
  ];

  if (showVariance) {
    tags.push({
      key: 'variance',
      label: 'Variance',
      testId: `event-card-variance-${eventId}`,
      className: 'event-card__variance-badge',
    });
  }

  const showSingleTagInCompactHeader = compact && tags.length === 1;

  return (
    <article
      className={['event-card', compact ? 'event-card--compact' : ''].filter(Boolean).join(' ')}
      data-testid={`event-card-${eventId}`}
      onClick={(e) => {
        if (!onActivate) {
          return;
        }
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        onActivate();
      }}
      onKeyDown={(e) => {
        if (!onActivate || e.key !== 'Enter') {
          return;
        }
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        onActivate();
      }}
      role={onActivate ? 'button' : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <header className="event-card__header">
        <div className="event-card__heading">
          <h3 className="event-card__title">{title}</h3>
          {!compact && (
            <p className="event-card__date" data-testid={`event-card-date-${eventId}`}>
              {formatEventDate(event.eventDate)}
            </p>
          )}
        </div>
        {showSingleTagInCompactHeader ? (
          <EventCardBadgeList tags={tags} eventId={eventId} eventDate={event.eventDate} />
        ) : (
          !compact
          && onPinToggle && (
            <button
              type="button"
              className="event-card__pin"
              aria-label={pinnedState ? 'Unpin event' : 'Pin event'}
              data-testid={`event-card-pin-${eventId}`}
              onClick={onPinToggle}
            >
              <FontAwesomeIcon
                icon={pinnedState ? faThumbtackSlash : faThumbtack}
                className="event-card__pin-icon"
                aria-hidden="true"
              />
            </button>
          )
        )}
      </header>
      {compact ? (
        <div className="event-card__meta-row">
          <span className="event-card__date" data-testid={`event-card-date-${eventId}`}>
            {formatEventDate(event.eventDate)}
          </span>
          {tags.length > 1 && (
            <EventCardBadgeList tags={tags} eventId={eventId} eventDate={event.eventDate} />
          )}
        </div>
      ) : (
        <>
          <div className="event-card__badges">
            <EventCardBadgeList tags={tags} eventId={eventId} eventDate={event.eventDate} />
          </div>
          {quickLinksNav}
        </>
      )}
      {showProgressBar && (
        <EventCardProgressBar
          eventId={eventId}
          bookingPlacementStatus={bookingStatus}
          eventDate={event.eventDate}
          compact={compact}
        />
      )}
    </article>
  );
}
