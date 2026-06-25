import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';
import { deriveBottleneckAlerts, deriveLifecyclePhase } from '@/lib/eventLifecycle';
import {
  deriveBottleneckAlertsFromSummary,
  mergeBottleneckAlerts,
} from '@/lib/eventCardSummary';
import { BOOKING_PREVIEW_TOOLTIP, getBookingStatusLabel } from '@/lib/eventCardLabels';
import { resolveQuickLinks, type WorkspaceFocus } from '@/lib/eventCardQuickLinks';
import { eventHasNegativeVariance } from '@/lib/eventCardVariance';
import type { EventCardDto, EventResponse, LineItemDto, PermissionsDto } from '@/types/generated-api';

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
}: EventCardProps) {
  const eventId = event.eventId ?? 'unknown';
  const venueId = event.venueId ?? '';
  const title = event.title?.trim() || 'Untitled event';
  const phase = deriveLifecyclePhase(event);
  const quickLinks = resolveQuickLinks(phase, permissions);
  const summaryAlerts = isEventCardDto(event) ? deriveBottleneckAlertsFromSummary(event) : [];
  const bottleneckAlerts = mergeBottleneckAlerts(summaryAlerts, deriveBottleneckAlerts(event));
  const showVariance =
    (isEventCardDto(event) && event.hasVarianceConcern === true)
    || (lineItems != null && eventHasNegativeVariance(lineItems));
  const pinnedState = isPinned ?? (isEventCardDto(event) ? event.isPinned === true : false);
  const bookingLabel = getBookingStatusLabel(
    'bookingPlacementStatus' in event ? event.bookingPlacementStatus : null,
    event.eventId,
  );

  return (
    <article
      className="event-card"
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
        <h3 className="event-card__title">{title}</h3>
        {onPinToggle && (
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
        )}
      </header>
      <p className="event-card__date" data-testid={`event-card-date-${eventId}`}>
        {formatEventDate(event.eventDate)}
      </p>
      <span
        className="event-card__booking-badge"
        title={BOOKING_PREVIEW_TOOLTIP}
        data-testid={`event-card-booking-${eventId}`}
      >
        {bookingLabel}
      </span>
      {showVariance && (
        <span className="event-card__variance-badge" data-testid={`event-card-variance-${eventId}`}>
          Variance
        </span>
      )}
      {bottleneckAlerts.map((alert) => (
        <span
          key={alert.kind}
          className="event-card__alert-chip badge-action-required"
          data-testid={`event-card-alert-${alert.kind}-${eventId}`}
        >
          {alert.label}
        </span>
      ))}
      {quickLinks.length > 0 && (
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
      )}
    </article>
  );
}
