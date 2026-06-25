import { useEffect, useMemo, useState } from 'react';
import { useRegions } from '@/api/regions';
import { RegionManagementPanel } from '@/components/booking/RegionManagementPanel';
import { DeleteVenueConfirm } from '@/components/venue/DeleteVenueConfirm';
import { VenueEditModal } from '@/components/venue/VenueEditModal';
import { VenueList } from '@/components/venue/VenueList';
import { VenueListGrouped } from '@/components/venue/VenueListGrouped';
import { VenuesPageControls } from '@/components/venue/VenuesPageControls';
import { useDeleteVenue } from '@/api/venues';
import { useUserProfile } from '@/api/user';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { navigateToCreateVenue } from '@/lib/dashboardRoute';
import {
  buildGroupedSections,
  buildRegionFilterOptions,
  filterVenuesByRegion,
  sortVenuesByName,
  type VenueDisplayMode,
} from '@/lib/venueListView';
import {
  readVenuesPageDisplayMode,
  readVenuesPageRegionFilter,
  writeVenuesPageDisplayMode,
  writeVenuesPageRegionFilter,
  type VenueRegionFilter,
} from '@/lib/venueListViewStorage';
import { useActiveVenue } from '@/venue/useActiveVenue';
import type { VenueResponse } from '@/types/generated-api';

function mapDeleteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to delete this venue.';
  }
  if (message.includes('404')) {
    return 'Venue not found.';
  }
  return 'Unable to delete venue. Please try again.';
}

export function VenuesPage() {
  const { isLoading: profileLoading } = useUserProfile();
  const canManageVenues = useCanManageVenues();
  const { venues, isPending, isError, refetch } = useActiveVenue();
  const { data: regions = [], isLoading: regionsLoading } = useRegions();
  const deleteVenue = useDeleteVenue();

  const [regionFilter, setRegionFilter] = useState<VenueRegionFilter>(
    () => readVenuesPageRegionFilter() ?? 'all',
  );
  const [displayMode, setDisplayMode] = useState<VenueDisplayMode>(
    () => readVenuesPageDisplayMode() ?? 'flat',
  );
  const [regionsPanelOpen, setRegionsPanelOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueResponse | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<VenueResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    writeVenuesPageRegionFilter(regionFilter);
  }, [regionFilter]);

  useEffect(() => {
    writeVenuesPageDisplayMode(displayMode);
  }, [displayMode]);

  const filterOptions = useMemo(
    () => buildRegionFilterOptions(venues, regions),
    [venues, regions],
  );

  const filteredVenues = useMemo(
    () => sortVenuesByName(filterVenuesByRegion(venues, regionFilter)),
    [venues, regionFilter],
  );

  const groupedSections = useMemo(
    () => buildGroupedSections(venues, regions, regionFilter),
    [venues, regions, regionFilter],
  );

  const showEmpty = !isPending && !isError && venues.length === 0;
  const showFilterEmpty =
    !isPending && !isError && venues.length > 0 && filteredVenues.length === 0;
  const showVenueList = !isPending && !isError && venues.length > 0 && filteredVenues.length > 0;
  const showRegionFilter = regions.length > 0;
  const showDisplayToggle = venues.length > 0;
  const noRegionsHelperText =
    !regionsLoading && regions.length === 0 && canManageVenues
      ? 'Create regions with Manage regions to organize venues by territory.'
      : undefined;

  const handleDeleteConfirm = async () => {
    if (!deletingVenue?.id) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteVenue.mutateAsync(deletingVenue.id);
      setDeletingVenue(null);
    } catch (error) {
      setDeleteError(mapDeleteError(error));
    }
  };

  const listHandlers = {
    canManage: canManageVenues,
    onEdit: setEditingVenue,
    onDelete: (venue: VenueResponse) => {
      setDeleteError(null);
      setDeletingVenue(venue);
    },
  };

  return (
    <div className="venues-page" data-testid="venues-page">
      <header className="venues-page__header">
        <h1 className="venues-page__title">Venues</h1>
        {!profileLoading && canManageVenues ? (
          <button
            type="button"
            className="venues-page__add btn-primary--compact"
            data-testid="venues-add-venue"
            onClick={() => navigateToCreateVenue()}
          >
            Add venue
          </button>
        ) : null}
      </header>

      {!isPending && !isError ? (
        <VenuesPageControls
          regionFilter={regionFilter}
          displayMode={displayMode}
          filterOptions={filterOptions}
          showRegionFilter={showRegionFilter}
          showDisplayToggle={showDisplayToggle}
          canManageVenues={!profileLoading && canManageVenues}
          noRegionsHelperText={noRegionsHelperText}
          onRegionFilterChange={setRegionFilter}
          onDisplayModeChange={setDisplayMode}
          onManageRegions={() => setRegionsPanelOpen(true)}
        />
      ) : null}

      {isPending ? (
        <div className="dashboard-empty" role="status" aria-live="polite">
          Loading venues…
        </div>
      ) : null}

      {!isPending && isError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load venues. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry btn-primary"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showEmpty ? (
        <section className="dashboard-empty" aria-labelledby="venues-empty-heading">
          <h2 id="venues-empty-heading" className="dashboard-empty__heading">
            No venues yet
          </h2>
          <p className="dashboard-empty__text">
            {!profileLoading && canManageVenues
              ? 'Your organization is set up. Add a venue to start managing events and ledgers.'
              : !profileLoading
                ? 'Your organization does not have any venues yet. Ask someone with venue management access to add one before you can begin.'
                : 'Your organization is set up. Add a venue to start managing events and ledgers.'}
          </p>
          {!profileLoading && canManageVenues ? (
            <button
              type="button"
              className="dashboard-empty__cta"
              data-testid="venues-empty-add-venue"
              onClick={() => navigateToCreateVenue()}
            >
              Add venue
            </button>
          ) : null}
        </section>
      ) : null}

      {showFilterEmpty ? (
        <section className="dashboard-empty" aria-labelledby="venues-filter-empty-heading">
          <h2 id="venues-filter-empty-heading" className="dashboard-empty__heading">
            No venues in this region
          </h2>
          <p className="dashboard-empty__text">
            No venues match the selected region filter. Try choosing a different region or All
            regions.
          </p>
        </section>
      ) : null}

      {showVenueList && displayMode === 'flat' ? (
        <VenueList venues={filteredVenues} {...listHandlers} />
      ) : null}

      {showVenueList && displayMode === 'grouped' ? (
        <VenueListGrouped sections={groupedSections} {...listHandlers} />
      ) : null}

      {editingVenue ? (
        <VenueEditModal
          venue={editingVenue}
          open
          onClose={() => setEditingVenue(null)}
          onSaved={() => void refetch()}
        />
      ) : null}

      {deletingVenue ? (
        <DeleteVenueConfirm
          venue={deletingVenue}
          open
          isPending={deleteVenue.isPending}
          error={deleteError}
          onCancel={() => {
            setDeleteError(null);
            setDeletingVenue(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}

      <RegionManagementPanel open={regionsPanelOpen} onClose={() => setRegionsPanelOpen(false)} />
    </div>
  );
}
