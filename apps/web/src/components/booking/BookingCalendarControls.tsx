import type { RegionResponse, VenueResponse } from '@/types/generated-api';
import type { CalendarViewContext } from '@/lib/bookingCalendar';
import { SelectField } from '@/components/auth/SelectField';
import { BookingCalendarDisplayModeToggle } from '@/components/booking/BookingCalendarDisplayModeToggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

const VIEW_MODE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'regional', label: 'Regional' },
  { value: 'venue', label: 'Venue' },
];

const INLINE_FIELD = 'booking-calendar-controls__field booking-calendar-controls__field--inline';
const INLINE_LABEL = 'booking-calendar-controls__label';

export interface BookingCalendarControlsProps {
  context: CalendarViewContext;
  regions: RegionResponse[];
  venues: VenueResponse[];
  onContextChange: (next: CalendarViewContext) => void;
  onCreateEvent: () => void;
  onCreateHold: () => void;
}

export function BookingCalendarControls({
  context,
  regions,
  venues,
  onContextChange,
  onCreateEvent,
  onCreateHold,
}: BookingCalendarControlsProps) {
  return (
    <div className="booking-calendar-controls" data-testid="booking-calendar-controls">
      <header className="booking-calendar-controls__header" data-testid="booking-calendar-controls-header">
        <div className="booking-calendar-controls__header-start">
          <SelectField
            id="booking-view-mode"
            label="View"
            value={context.viewMode}
            options={VIEW_MODE_OPTIONS}
            onChange={(viewMode) =>
              onContextChange({
                ...context,
                viewMode: viewMode as CalendarViewContext['viewMode'],
              })
            }
            wrapperClassName={INLINE_FIELD}
            labelClassName={INLINE_LABEL}
            data-testid="booking-view-mode"
          />

          {context.viewMode === 'regional' ? (
            <SelectField
              id="booking-region-filter"
              label="Region"
              value={context.regionId ?? ''}
              placeholder="Select region"
              options={regions.map((region) => ({
                value: region.id ?? '',
                label: region.name ?? 'Unnamed region',
              }))}
              onChange={(regionId) =>
                onContextChange({
                  ...context,
                  regionId: regionId || null,
                })
              }
              wrapperClassName={INLINE_FIELD}
              labelClassName={INLINE_LABEL}
              data-testid="booking-region-filter"
            />
          ) : null}

          {context.viewMode === 'venue' ? (
            <SelectField
              id="booking-venue-filter"
              label="Venue"
              value={context.venueId ?? ''}
              placeholder="Select venue"
              options={venues.map((venue) => ({
                value: venue.id ?? '',
                label: venue.name ?? 'Unnamed venue',
              }))}
              onChange={(venueId) =>
                onContextChange({
                  ...context,
                  venueId: venueId || null,
                })
              }
              wrapperClassName={INLINE_FIELD}
              labelClassName={INLINE_LABEL}
              data-testid="booking-venue-filter"
            />
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
      </div>
    </div>
  );
}
