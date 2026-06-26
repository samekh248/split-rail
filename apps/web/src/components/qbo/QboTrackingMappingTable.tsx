import { useState } from 'react';
import {
  useCreateTrackingMapping,
  useDeleteTrackingMapping,
  useQboTrackingMappings,
} from '@/api/qbo';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';

export interface QboTrackingMappingTableProps {
  venueId: string;
}

export function QboTrackingMappingTable({ venueId }: QboTrackingMappingTableProps) {
  const mappingsQuery = useQboTrackingMappings(venueId);
  const deleteMutation = useDeleteTrackingMapping(venueId);
  const createMutation = useCreateTrackingMapping(venueId);
  const [filter, setFilter] = useState('');

  if (mappingsQuery.isLoading) {
    return <LoadingPlaceholder variant="zone" label="Loading tracking mappings" />;
  }

  const mappings = (mappingsQuery.data?.mappings ?? []).filter((mapping) => {
    const haystack = `${mapping.qboTrackingName} ${mapping.targetDisplayName ?? ''}`.toLowerCase();
    return haystack.includes(filter.toLowerCase());
  });

  return (
    <div className="qbo-mapping-table" data-testid="qbo-tracking-mapping-table">
      <label className="qbo-mapping-table__filter">
        Filter
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          data-testid="qbo-tracking-mapping-filter"
        />
      </label>
      <table>
        <thead>
          <tr>
            <th>QBO name</th>
            <th>Type</th>
            <th>Tier</th>
            <th>Target</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => (
            <tr key={mapping.id} data-testid="qbo-tracking-mapping-row">
              <td>{mapping.qboTrackingName}</td>
              <td>{mapping.qboTrackingType}</td>
              <td>{mapping.targetTier}</td>
              <td>{mapping.targetDisplayName ?? mapping.targetEntityId}</td>
              <td>
                <button
                  type="button"
                  className="btn-outline btn-outline--compact"
                  data-testid={`qbo-tracking-delete-${mapping.id}`}
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(mapping.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {mappings.length === 0 && (
        <p className="qbo-mapping-table__empty" data-testid="qbo-tracking-mapping-empty">
          No tracking mappings yet. Use Quick Assign on event, venue, or region forms to create bindings.
        </p>
      )}
      {createMutation.isError && (
        <p role="alert" className="qbo-mapping-table__error">
          Could not save tracking mapping.
        </p>
      )}
    </div>
  );
}
