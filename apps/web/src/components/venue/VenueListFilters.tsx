import { SelectField } from '@/components/auth/SelectField';
import type { RegionFilterOption } from '@/lib/venueListView';
import type { VenueRegionFilter } from '@/lib/venueListViewStorage';

export interface VenueListFiltersProps {
  regionFilter: VenueRegionFilter;
  filterOptions: RegionFilterOption[];
  onRegionFilterChange: (value: VenueRegionFilter) => void;
}

export function VenueListFilters({
  regionFilter,
  filterOptions,
  onRegionFilterChange,
}: VenueListFiltersProps) {
  return (
    <div
      className="venue-list-filters"
      data-testid="venue-list-filters"
      aria-label="Venue filters"
    >
      <SelectField
        id="venues-region-filter"
        label="Region"
        value={regionFilter}
        options={filterOptions}
        onChange={(value) => onRegionFilterChange(value as VenueRegionFilter)}
        wrapperClassName="venue-list-filters__control"
        labelClassName="venue-list-filters__label"
        data-testid="venues-region-filter"
      />
    </div>
  );
}
