import { useState } from 'react';
import { useVenueMappings } from '@/api/qbo';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';

export interface QboAccountMappingTableProps {
  venueId: string;
}

export function QboAccountMappingTable({ venueId }: QboAccountMappingTableProps) {
  const mappingsQuery = useVenueMappings(venueId);
  const [filter, setFilter] = useState('');

  if (mappingsQuery.isLoading) {
    return <LoadingPlaceholder variant="zone" label="Loading account mappings" />;
  }

  const mappings = (mappingsQuery.data?.mappings ?? []).filter((mapping) => {
    const haystack = `${mapping.qboAccountName ?? ''} ${mapping.mappedCategoryLabel ?? ''}`.toLowerCase();
    return haystack.includes(filter.toLowerCase());
  });

  return (
    <div className="qbo-mapping-table" data-testid="qbo-account-mapping-table">
      <div className="form-field qbo-mapping-table__filter">
        <label htmlFor="qbo-account-mapping-filter" className="form-field__label">
          Filter mappings
        </label>
        <input
          id="qbo-account-mapping-filter"
          className="form-field__input"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          data-testid="qbo-account-mapping-filter"
        />
      </div>
      {mappings.length === 0 ? (
        <p className="team-section__empty" data-testid="qbo-account-mapping-empty">
          No account mappings yet.
        </p>
      ) : (
        <table className="team-table">
          <thead>
            <tr>
              <th scope="col">QBO account</th>
              <th scope="col">Mapped category</th>
              <th scope="col">Line item</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.id} data-testid="qbo-account-mapping-row">
                <td>{mapping.qboAccountName}</td>
                <td>{mapping.mappedCategoryLabel}</td>
                <td>{mapping.mappedLineItemId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
