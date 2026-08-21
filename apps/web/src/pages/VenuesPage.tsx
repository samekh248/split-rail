import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';
import { useCreateRegion, useDeleteRegion, useRegions, useUpdateRegion } from '@/api/regions';
import { AddRegionControl } from '@/components/venue/AddRegionControl';
import { AddVenueModal } from '@/components/venue/AddVenueModal';
import { DeleteRegionConfirm } from '@/components/venue/DeleteRegionConfirm';
import { DeleteVenueConfirm } from '@/components/venue/DeleteVenueConfirm';
import { RegionDeleteResolutionModal } from '@/components/venue/RegionDeleteResolutionModal';
import { RegionNameForm } from '@/components/venue/RegionNameForm';
import { VenueEditModal } from '@/components/venue/VenueEditModal';
import { VenueList } from '@/components/venue/VenueList';
import { VenueListFilters } from '@/components/venue/VenueListFilters';
import { VenueListGrouped } from '@/components/venue/VenueListGrouped';
import { useDeleteVenue } from '@/api/venues';
import { useUserProfile } from '@/api/user';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import {
  buildGroupedSections,
  buildRegionFilterOptions,
  filterVenuesByRegion,
  sortVenuesByName,
} from '@/lib/venueListView';
import {
  readVenuesPageRegionFilter,
  writeVenuesPageRegionFilter,
  type VenueRegionFilter,
} from '@/lib/venueListViewStorage';
import { useActiveVenue } from '@/venue/useActiveVenue';
import type { RegionResponse, VenueResponse } from '@/types/generated-api';

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
  const { data: regions = [], isLoading: regionsLoading, refetch: refetchRegions } = useRegions();
  const createRegion = useCreateRegion();
  const deleteRegion = useDeleteRegion();
  const deleteVenue = useDeleteVenue();

  const [regionFilter, setRegionFilter] = useState<VenueRegionFilter>(
    () => readVenuesPageRegionFilter() ?? 'all',
  );
  const [addRegionError, setAddRegionError] = useState<string | null>(null);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState('');
  const [editingRegionNotes, setEditingRegionNotes] = useState<string | null>(null);
  const [editRegionError, setEditRegionError] = useState<string | null>(null);
  const [deleteResolutionRegion, setDeleteResolutionRegion] = useState<RegionResponse | null>(null);
  const [deletingRegion, setDeletingRegion] = useState<RegionResponse | null>(null);
  const [deleteRegionError, setDeleteRegionError] = useState<string | null>(null);
  const [editingVenue, setEditingVenue] = useState<VenueResponse | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<VenueResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addVenueRegionId, setAddVenueRegionId] = useState<string | null>(null);

  const updateRegion = useUpdateRegion(editingRegionId ?? '');

  useEffect(() => {
    writeVenuesPageRegionFilter(regionFilter);
  }, [regionFilter]);

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

  const hasRegions = !regionsLoading && regions.length > 0;
  const canManage = !profileLoading && canManageVenues;
  const showEmpty = !isPending && !isError && !hasRegions && venues.length === 0;
  const showVenueList = !isPending && !isError && (hasRegions || venues.length > 0);
  const showBody = !isPending && !isError && !regionsLoading;
  const showToolbar = showBody && (hasRegions || canManage);

  const handleAddRegion = async (name: string): Promise<boolean> => {
    setAddRegionError(null);
    try {
      await createRegion.mutateAsync({ name, notes: null });
      await refetchRegions();
      return true;
    } catch (caught) {
      setAddRegionError(caught instanceof Error ? caught.message : 'Unable to create region.');
      return false;
    }
  };

  const handleStartEditRegion = (regionId: string) => {
    const region = regions.find((entry) => entry.id === regionId);
    setEditingRegionId(regionId);
    setEditingRegionName(region?.name ?? '');
    setEditingRegionNotes(region?.notes ?? null);
    setEditRegionError(null);
  };

  const handleSaveRegion = async () => {
    if (!editingRegionId) {
      return;
    }
    setEditRegionError(null);
    try {
      await updateRegion.mutateAsync({
        name: editingRegionName,
        notes: editingRegionNotes,
      });
      setEditingRegionId(null);
      setEditingRegionName('');
      setEditingRegionNotes(null);
      await refetchRegions();
    } catch (caught) {
      setEditRegionError(caught instanceof Error ? caught.message : 'Unable to update region.');
    }
  };

  const handleDeleteRegion = (regionId: string) => {
    const region = regions.find((entry) => entry.id === regionId);
    if (!region?.id) {
      return;
    }
    if ((region.venueCount ?? 0) > 0) {
      setDeleteResolutionRegion(region);
      return;
    }
    setDeleteRegionError(null);
    setDeletingRegion(region);
  };

  const handleDeleteRegionConfirm = async () => {
    if (!deletingRegion?.id) {
      return;
    }
    setDeleteRegionError(null);
    try {
      await deleteRegion.mutateAsync({ regionId: deletingRegion.id });
      setDeletingRegion(null);
      await refetchRegions();
    } catch (caught) {
      setDeleteRegionError(
        caught instanceof Error ? caught.message : 'Unable to delete region. Please try again.',
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVenue?.id) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteVenue.mutateAsync(deletingVenue.id);
      setDeletingVenue(null);
      setEditingVenue(null);
    } catch (error) {
      setDeleteError(mapDeleteError(error));
    }
  };

  const listHandlers = {
    canManage: canManageVenues,
    onEdit: setEditingVenue,
  };

  return (
    <main className="venues-page" data-testid="venues-page">
      <header className="venues-page__header section-header">
        <h1 className="venues-page__title">Venues</h1>
      </header>

      {isPending ? (
        <LoadingPlaceholder
          variant="page"
          label="Loading venues…"
          data-testid="venues-page-loading"
        />
      ) : null}

      {!isPending && isError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load venues. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry btn-primary btn-icon-label"
            onClick={() => void refetch()}
          >
            <FontAwesomeIcon icon={faRotate} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}

      {showBody ? (
        <section className="venues-page__body" data-testid="venues-page-body">
          {showToolbar ? (
            <div className="venues-page__toolbar" data-testid="venues-page-toolbar">
              {hasRegions ? (
                <VenueListFilters
                  regionFilter={regionFilter}
                  filterOptions={filterOptions}
                  onRegionFilterChange={setRegionFilter}
                />
              ) : null}
              {canManage ? (
                <AddRegionControl
                  pending={createRegion.isPending}
                  error={addRegionError}
                  submitLabel={hasRegions ? 'Add region' : 'Create region'}
                  onSubmit={handleAddRegion}
                />
              ) : null}
            </div>
          ) : null}

          {showEmpty ? (
            <div className="dashboard-empty" aria-labelledby="venues-empty-heading">
              <h2 id="venues-empty-heading" className="dashboard-empty__heading">
                No venues yet
              </h2>
              <p className="dashboard-empty__text">
                {!profileLoading && canManageVenues
                  ? 'Create a region to start adding venues.'
                  : !profileLoading
                    ? 'Your organization does not have any venues yet. Ask someone with venue management access to set up a region and add venues before you can begin.'
                    : 'Create a region to start adding venues.'}
              </p>
            </div>
          ) : null}

          {showVenueList ? (
            hasRegions ? (
              <VenueListGrouped
                sections={groupedSections}
                onAddVenue={setAddVenueRegionId}
                editingRegionId={editingRegionId}
                regionEditor={
                  <RegionNameForm
                    idPrefix="venues-edit-region"
                    name={editingRegionName}
                    onNameChange={setEditingRegionName}
                    onSubmit={() => void handleSaveRegion()}
                    onCancel={() => {
                      setEditingRegionId(null);
                      setEditingRegionName('');
                      setEditingRegionNotes(null);
                      setEditRegionError(null);
                    }}
                    submitLabel="Save"
                    fieldLabel="Region name"
                    pending={updateRegion.isPending}
                    error={editRegionError}
                    testId="venues-edit-region"
                  />
                }
                onEditRegion={canManage ? handleStartEditRegion : undefined}
                onDeleteRegion={canManage ? handleDeleteRegion : undefined}
                {...listHandlers}
              />
            ) : (
              <VenueList venues={filteredVenues} {...listHandlers} />
            )
          ) : null}
        </section>
      ) : null}

      {addVenueRegionId ? (
        <AddVenueModal
          regionId={addVenueRegionId}
          regionName={
            regions.find((region) => region.id === addVenueRegionId)?.name ?? 'this region'
          }
          open
          onClose={() => setAddVenueRegionId(null)}
          onCreated={() => void refetch()}
        />
      ) : null}

      {editingVenue ? (
        <VenueEditModal
          venue={editingVenue}
          open
          onClose={() => setEditingVenue(null)}
          onSaved={() => void refetch()}
          onDeleteRequest={() => {
            setDeleteError(null);
            setDeletingVenue(editingVenue);
          }}
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

      {deletingRegion ? (
        <DeleteRegionConfirm
          region={deletingRegion}
          open
          isPending={deleteRegion.isPending}
          error={deleteRegionError}
          onCancel={() => {
            setDeleteRegionError(null);
            setDeletingRegion(null);
          }}
          onConfirm={handleDeleteRegionConfirm}
        />
      ) : null}

      {deleteResolutionRegion ? (
        <RegionDeleteResolutionModal
          region={deleteResolutionRegion}
          open
          onClose={() => setDeleteResolutionRegion(null)}
          onDeleted={() => void refetchRegions()}
        />
      ) : null}
    </main>
  );
}
