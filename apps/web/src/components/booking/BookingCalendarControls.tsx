import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import type { RegionResponse, VenueResponse } from '@/types/generated-api';
import type { CalendarViewContext } from '@/lib/bookingCalendar';

export interface BookingCalendarControlsProps {
  context: CalendarViewContext;
  regions: RegionResponse[];
  venues: VenueResponse[];
  onContextChange: (next: CalendarViewContext) => void;
  onCreateEvent: () => void;
  onCreateHold: () => void;
  onManageRegions: () => void;
}

function currentMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}`;
}

export function BookingCalendarControls({
  context,
  regions,
  venues,
  onContextChange,
  onCreateEvent,
  onCreateHold,
  onManageRegions,
}: BookingCalendarControlsProps) {
  const monthLabel = useMemo(() => currentMonthLabel(context.month), [context.month]);

  return (
    <div className="booking-calendar-controls" data-testid="booking-calendar-controls">
      <div className="booking-calendar-controls__row">
        <label className="booking-calendar-controls__field">
          View
          <select
            data-testid="booking-view-mode"
            value={context.viewMode}
            onChange={(event) =>
              onContextChange({
                ...context,
                viewMode: event.target.value as CalendarViewContext['viewMode'],
              })
            }
          >
            <option value="global">Global</option>
            <option value="regional">Regional</option>
            <option value="venue">Venue</option>
          </select>
        </label>

        {context.viewMode === 'regional' ? (
          <label className="booking-calendar-controls__field">
            Region
            <select
              data-testid="booking-region-filter"
              value={context.regionId ?? ''}
              onChange={(event) =>
                onContextChange({
                  ...context,
                  regionId: event.target.value || null,
                })
              }
            >
              <option value="">Select region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id ?? ''}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {context.viewMode === 'venue' ? (
          <label className="booking-calendar-controls__field">
            Venue
            <select
              data-testid="booking-venue-filter"
              value={context.venueId ?? ''}
              onChange={(event) =>
                onContextChange({
                  ...context,
                  venueId: event.target.value || null,
                })
              }
            >
              <option value="">Select venue</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id ?? ''}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="booking-calendar-controls__month">
          <button
            type="button"
            data-testid="booking-month-prev"
            aria-label="Previous month"
            onClick={() =>
              onContextChange({ ...context, month: shiftMonth(context.month, -1) })
            }
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span>{monthLabel}</span>
          <button
            type="button"
            data-testid="booking-month-next"
            aria-label="Next month"
            onClick={() =>
              onContextChange({ ...context, month: shiftMonth(context.month, 1) })
            }
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <div className="booking-calendar-controls__row">
        <button type="button" data-testid="booking-create-event" onClick={onCreateEvent}>
          <FontAwesomeIcon icon={faPlus} /> Create Event
        </button>
        <button type="button" data-testid="booking-create-hold" onClick={onCreateHold}>
          <FontAwesomeIcon icon={faPlus} /> Create Hold
        </button>
        <label className="booking-calendar-controls__toggle">
          <input
            type="checkbox"
            data-testid="booking-show-cancelled"
            checked={context.showCancelled}
            onChange={(event) =>
              onContextChange({ ...context, showCancelled: event.target.checked })
            }
          />
          Show cancelled
        </label>
        <button type="button" data-testid="booking-manage-regions" onClick={onManageRegions}>
          Manage regions
        </button>
      </div>
    </div>
  );
}
