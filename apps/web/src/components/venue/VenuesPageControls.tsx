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
  showRegionFilter: boolean;
  showDisplayToggle: boolean;
  canManageVenues: boolean;
  noRegionsHelperText?: string;
  onRegionFilterChange: (value: VenueRegionFilter) => void;
  onDisplayModeChange: (value: VenueDisplayMode) => void;
  onManageRegions: () => void;
}

export function VenuesPageControls({
  regionFilter,
  displayMode,
  filterOptions,
  showRegionFilter,
  showDisplayToggle,
  canManageVenues,
  noRegionsHelperText,
  onRegionFilterChange,
  onDisplayModeChange,
  onManageRegions,
}: VenuesPageControlsProps) {
  const showToolbar = showRegionFilter || showDisplayToggle || canManageVenues || noRegionsHelperText;

  if (!showToolbar) {
    return null;
  }

  return (
    <div className="venues-page-controls" data-testid="venues-page-controls">
      <div className="venues-page-controls__fields">
        {showRegionFilter ? (
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
        ) : null}

        {showDisplayToggle ? (
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
        ) : null}
      </div>

      {canManageVenues ? (
        <button
          type="button"
          className="venues-page-controls__manage-regions btn-secondary"
          data-testid="venues-manage-regions"
          onClick={onManageRegions}
        >
          Manage regions
        </button>
      ) : null}

      {noRegionsHelperText ? (
        <p className="venues-page-controls__helper" data-testid="venues-no-regions-helper">
          {noRegionsHelperText}
        </p>
      ) : null}
    </div>
  );
}
