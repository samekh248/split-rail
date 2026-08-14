import {
  bookingStatusLabel,
  FESTIVAL_BOOKING_STATUSES,
  normalizeBookingStatus,
} from '@/lib/festivalBookingStatus';
import type { ProgrammingBlockResponse, StageZoneResponse } from '@/types/generated-api';

export const BLOCK_SCHEDULE_STATUSES = [
  'SCHEDULED',
  'DELAYED',
  'PARTIALLY_COMPLETED',
  'CANCELED',
] as const;

export const BLOCK_CATEGORIES_FILTER = ['MUSIC', 'EXHIBITION', 'VENDOR', 'EXPERIENCE'] as const;

export interface ItineraryFilterValues {
  stageZoneId: string;
  category: string;
  status: string;
  bookingStatus: string;
}

export const DEFAULT_ITINERARY_FILTERS: ItineraryFilterValues = {
  stageZoneId: '',
  category: '',
  status: '',
  bookingStatus: '',
};

export interface ItineraryFiltersProps {
  stages: StageZoneResponse[];
  values: ItineraryFilterValues;
  onChange: (values: ItineraryFilterValues) => void;
}

function categoryLabel(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function statusLabel(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function applyItineraryFilters(
  blocks: ProgrammingBlockResponse[],
  filters: ItineraryFilterValues,
): ProgrammingBlockResponse[] {
  return blocks.filter((block) => {
    if (filters.stageZoneId && block.stageZoneId !== filters.stageZoneId) {
      return false;
    }
    if (filters.category && block.category !== filters.category) {
      return false;
    }
    if (filters.status && block.scheduleStatus !== filters.status) {
      return false;
    }
    if (
      filters.bookingStatus &&
      normalizeBookingStatus(block.bookingStatus) !== filters.bookingStatus
    ) {
      return false;
    }
    return true;
  });
}

export function ItineraryFilters({ stages, values, onChange }: ItineraryFiltersProps) {
  return (
    <div className="itinerary-filters" data-testid="itinerary-filters">
      <div className="itinerary-filters__field">
        <label htmlFor="itinerary-filter-stage" className="itinerary-filters__label">
          Stage
        </label>
        <select
          id="itinerary-filter-stage"
          className="itinerary-filters__select"
          value={values.stageZoneId}
          onChange={(event) => onChange({ ...values, stageZoneId: event.target.value })}
          data-testid="itinerary-filter-stage"
        >
          <option value="">All stages</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id ?? ''}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      <div className="itinerary-filters__field">
        <label htmlFor="itinerary-filter-category" className="itinerary-filters__label">
          Category
        </label>
        <select
          id="itinerary-filter-category"
          className="itinerary-filters__select"
          value={values.category}
          onChange={(event) => onChange({ ...values, category: event.target.value })}
          data-testid="itinerary-filter-category"
        >
          <option value="">All categories</option>
          {BLOCK_CATEGORIES_FILTER.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </div>

      <div className="itinerary-filters__field">
        <label htmlFor="itinerary-filter-status" className="itinerary-filters__label">
          Status
        </label>
        <select
          id="itinerary-filter-status"
          className="itinerary-filters__select"
          value={values.status}
          onChange={(event) => onChange({ ...values, status: event.target.value })}
          data-testid="itinerary-filter-status"
        >
          <option value="">All statuses</option>
          {BLOCK_SCHEDULE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="itinerary-filters__field">
        <label htmlFor="itinerary-filter-booking" className="itinerary-filters__label">
          Booking
        </label>
        <select
          id="itinerary-filter-booking"
          className="itinerary-filters__select"
          value={values.bookingStatus}
          onChange={(event) => onChange({ ...values, bookingStatus: event.target.value })}
          data-testid="itinerary-filter-booking"
        >
          <option value="">Holds and confirmed</option>
          {FESTIVAL_BOOKING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {bookingStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
