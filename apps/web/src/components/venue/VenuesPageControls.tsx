import { SelectField } from '@/components/auth/SelectField';
import type { RegionFilterOption, VenueDisplayMode } from '@/lib/venueListView';
import type { VenueRegionFilter } from '@/lib/venueListViewStorage';

const DISPLAY_MODE_OPTIONS = [
  { value: 'flat', label: 'List' },
  { value: 'grouped', label: 'By region' },
];

export interface VenuesPageControlsProps {
  regionFilter: VenueRegionFilter;
  displayMode: VenueDisplayMode;
  filterOptions: RegionFilterOption[];
  hasRegions: boolean;
  canManageVenues: boolean;
  onRegionFilterChange: (value: VenueRegionFilter) => void;
  onDisplayModeChange: (value: VenueDisplayMode) => void;
  onManageRegions: () => void;
}

export function VenuesPageControls({
  regionFilter,
  displayMode,
  filterOptions,
  hasRegions,
  canManageVenues,
  onRegionFilterChange,
  onDisplayModeChange,
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

          <SelectField
            id="venues-display-mode"
            label="Display"
            value={displayMode}
            options={DISPLAY_MODE_OPTIONS}
            onChange={(value) => onDisplayModeChange(value as VenueDisplayMode)}
            wrapperClassName="venues-page-controls__field venues-page-controls__field--inline"
            labelClassName="venues-page-controls__label"
            data-testid="venues-display-mode"
          />
        </div>
      ) : null}

      {canManageVenues ? (
        <button
          type="button"
          className="venues-page-controls__manage-regions btn-secondary"
          data-testid="venues-manage-regions"
          onClick={onManageRegions}
        >
          {hasRegions ? 'Manage regions' : 'Create your first region'}
        </button>
      ) : null}
    </div>
  );
}
