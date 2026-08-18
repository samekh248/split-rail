import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import { MultiSelectField } from '@/components/auth/MultiSelectField';
import { SelectField } from '@/components/auth/SelectField';
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
  stageZoneIds: string[];
  category: string;
  status: string;
  bookingStatus: string;
}

export const DEFAULT_ITINERARY_FILTERS: ItineraryFilterValues = {
  stageZoneIds: [],
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
    if (
      filters.stageZoneIds.length > 0 &&
      !filters.stageZoneIds.includes(block.stageZoneId ?? '')
    ) {
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

export function filterStagesByItineraryFilter(
  stages: StageZoneResponse[],
  filters: ItineraryFilterValues,
): StageZoneResponse[] {
  if (filters.stageZoneIds.length === 0) {
    return stages;
  }

  return stages.filter((stage) => stage.id && filters.stageZoneIds.includes(stage.id));
}

export function ItineraryFilters({ stages, values, onChange }: ItineraryFiltersProps) {
  return (
    <div className="itinerary-filters" data-testid="itinerary-filters">
      <h2 className="itinerary-filters__heading">
        <FontAwesomeIcon icon={faFilter} aria-hidden="true" />
        Filters
      </h2>
      <div className="itinerary-filters__grid">
      <MultiSelectField
        id="itinerary-filter-stage"
        label="Stage"
        values={values.stageZoneIds}
        placeholder="All stages"
        options={stages.map((stage) => ({
          value: stage.id ?? '',
          label: stage.name ?? 'Stage',
        }))}
        onChange={(stageZoneIds) => onChange({ ...values, stageZoneIds })}
        data-testid="itinerary-filter-stage"
      />

      <SelectField
        id="itinerary-filter-category"
        label="Category"
        value={values.category}
        options={[
          { value: '', label: 'All categories' },
          ...BLOCK_CATEGORIES_FILTER.map((category) => ({
            value: category,
            label: categoryLabel(category),
          })),
        ]}
        onChange={(category) => onChange({ ...values, category })}
        data-testid="itinerary-filter-category"
      />

      <SelectField
        id="itinerary-filter-status"
        label="Status"
        value={values.status}
        options={[
          { value: '', label: 'All statuses' },
          ...BLOCK_SCHEDULE_STATUSES.map((status) => ({
            value: status,
            label: statusLabel(status),
          })),
        ]}
        onChange={(status) => onChange({ ...values, status })}
        data-testid="itinerary-filter-status"
      />

      <SelectField
        id="itinerary-filter-booking"
        label="Booking"
        value={values.bookingStatus}
        options={[
          { value: '', label: 'Holds and confirmed' },
          ...FESTIVAL_BOOKING_STATUSES.map((status) => ({
            value: status,
            label: bookingStatusLabel(status),
          })),
        ]}
        onChange={(bookingStatus) => onChange({ ...values, bookingStatus })}
        data-testid="itinerary-filter-booking"
      />
      </div>
    </div>
  );
}
