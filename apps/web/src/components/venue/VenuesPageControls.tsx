import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMap } from '@fortawesome/free-solid-svg-icons';
import { SelectField } from '@/components/auth/SelectField';
import type { RegionFilterOption } from '@/lib/venueListView';
import type { VenueRegionFilter } from '@/lib/venueListViewStorage';

export interface VenuesPageControlsProps {
  regionFilter: VenueRegionFilter;
  filterOptions: RegionFilterOption[];
  hasRegions: boolean;
  canManageVenues: boolean;
  onRegionFilterChange: (value: VenueRegionFilter) => void;
  onManageRegions: () => void;
}

export function VenuesPageControls({
  regionFilter,
  filterOptions,
  hasRegions,
  canManageVenues,
  onRegionFilterChange,
  onManageRegions,
}: VenuesPageControlsProps) {
  const showToolbar = hasRegions || canManageVenues;

  if (!showToolbar) {
    return null;
  }

  return (
    <div
      className={
        hasRegions ? 'venues-page-controls' : 'venues-page-controls venues-page-controls--bare'
      }
      data-testid="venues-page-controls"
    >
      {hasRegions ? (
        <div className="venues-page-controls__fields">
          <SelectField
            id="venues-region-filter"
            label="Region"
            value={regionFilter}
            options={filterOptions}
            onChange={(value) => onRegionFilterChange(value as VenueRegionFilter)}
            wrapperClassName="venues-page-controls__field venues-page-controls__field--inline"
            labelClassName="venues-page-controls__label"
            data-testid="venues-region-filter"
          />
        </div>
      ) : null}

      {canManageVenues ? (
        <button
          type="button"
          className="venues-page-controls__manage-regions btn-secondary btn-icon-label"
          data-testid="venues-manage-regions"
          onClick={onManageRegions}
        >
          <FontAwesomeIcon icon={faMap} aria-hidden="true" />
          {hasRegions ? 'Manage regions' : 'Create your first region'}
        </button>
      ) : null}
    </div>
  );
}
