import type { ReactNode } from 'react';
import {
  bookingStatusSwatchClass,
  formatBookingStatusLabel,
  type BookingPlacementStatus,
} from '@/lib/bookingCalendar';
import { formatTimeWithPreference } from '@/lib/timeDisplayFormat';
import type { EventResponse } from '@/types/generated-api';

export interface EventDetailsCardProps {
  event: EventResponse;
}

function isBookingPlacementStatus(value: string | null | undefined): value is BookingPlacementStatus {
  return value === 'HOLD_1' || value === 'HOLD_2' || value === 'CONFIRMED' || value === 'CANCELLED';
}

function statusModifier(status: BookingPlacementStatus): string {
  return status.toLowerCase().replace('_', '-');
}

function DetailGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="event-details-card__group">
      <h3 className="event-details-card__group-heading">{heading}</h3>
      <div className="event-details-card__group-body">{children}</div>
    </div>
  );
}

export function EventDetailsCard({ event }: EventDetailsCardProps) {
  const status = isBookingPlacementStatus(event.bookingPlacementStatus)
    ? event.bookingPlacementStatus
    : null;
  const visibleShowStartTime = status === 'CONFIRMED' ? event.showStartTime : null;
  const hasScheduleTimes = Boolean(event.doorsTime || visibleShowStartTime);

  return (
    <div className="event-details-card" data-testid="event-details-card">
      {status ? (
        <p
          className={`booking-event-drawer__status booking-event-drawer__status--${statusModifier(status)}`}
          data-testid="event-details-status"
        >
          <span
            className={`booking-calendar-legend__swatch ${bookingStatusSwatchClass(status)}`}
            aria-hidden="true"
          />
          {formatBookingStatusLabel(status)}
        </p>
      ) : null}

      <div className="event-details-card__body">
        <DetailGroup heading="Schedule">
          {hasScheduleTimes ? (
            <ul className="event-details-card__schedule-list">
              {event.doorsTime ? (
                <li>Doors: {formatTimeWithPreference(event.doorsTime)}</li>
              ) : null}
              {visibleShowStartTime ? (
                <li>Show start: {formatTimeWithPreference(visibleShowStartTime)}</li>
              ) : null}
            </ul>
          ) : (
            <p className="event-details-card__empty">No schedule times set.</p>
          )}
        </DetailGroup>

        <DetailGroup heading="Lineup">
          {event.supportLineup ? (
            <p className="event-details-card__text">{event.supportLineup}</p>
          ) : (
            <p className="event-details-card__empty">No supporting lineup set.</p>
          )}
        </DetailGroup>

        <DetailGroup heading="Notes">
          {event.notes ? (
            <p className="event-details-card__text">{event.notes}</p>
          ) : (
            <p className="event-details-card__empty">No notes yet.</p>
          )}
        </DetailGroup>
      </div>
    </div>
  );
}
