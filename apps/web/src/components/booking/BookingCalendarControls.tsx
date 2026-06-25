import type { RegionResponse, VenueResponse } from '@/types/generated-api';
import type { CalendarViewContext } from '@/lib/bookingCalendar';
import { BookingCalendarDisplayModeToggle } from '@/components/booking/BookingCalendarDisplayModeToggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

export interface BookingCalendarControlsProps {
  context: CalendarViewContext;
  regions: RegionResponse[];
  venues: VenueResponse[];
  onContextChange: (next: CalendarViewContext) => void;
  onCreateEvent: () => void;
  onCreateHold: () => void;
  onManageRegions: () => void;
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
  return (
    <div className="booking-calendar-controls" data-testid="booking-calendar-controls">
      <header className="booking-calendar-controls__header" data-testid="booking-calendar-controls-header">
        <div className="booking-calendar-controls__header-start">
          <label className="booking-calendar-controls__field booking-calendar-controls__field--inline">
            <span className="booking-calendar-controls__label">View</span>
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
            <label className="booking-calendar-controls__field booking-calendar-controls__field--inline">
              <span className="booking-calendar-controls__label">Region</span>
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
            <label className="booking-calendar-controls__field booking-calendar-controls__field--inline">
              <span className="booking-calendar-controls__label">Venue</span>
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
        </div>

        <div className="booking-calendar-controls__header-end">
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
          <BookingCalendarDisplayModeToggle
            displayMode={context.displayMode}
            onDisplayModeChange={(displayMode) => onContextChange({ ...context, displayMode })}
          />
        </div>
      </header>

      <div className="booking-calendar-controls__actions">
        <button type="button" data-testid="booking-create-event" onClick={onCreateEvent}>
          <FontAwesomeIcon icon={faPlus} /> Create Event
        </button>
        <button type="button" data-testid="booking-create-hold" onClick={onCreateHold}>
          <FontAwesomeIcon icon={faPlus} /> Create Hold
        </button>
        <button type="button" data-testid="booking-manage-regions" onClick={onManageRegions}>
          Manage regions
        </button>
      </div>
    </div>
  );
}
