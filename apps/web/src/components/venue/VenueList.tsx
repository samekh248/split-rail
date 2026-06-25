import type { VenueResponse } from '@/types/generated-api';

export interface VenueListProps {
  venues: VenueResponse[];
  canManage?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (venue: VenueResponse) => void;
  onDelete: (venue: VenueResponse) => void;
}

function formatCreatedAt(createdAt?: string | null): string {
  if (!createdAt) {
    return '—';
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function VenueList({
  venues,
  canManage = false,
  isLoading = false,
  isError = false,
  onRetry,
  onEdit,
  onDelete,
}: VenueListProps) {
  if (isLoading) {
    return (
      <section className="team-section" aria-labelledby="venue-list-heading">
        <h2 id="venue-list-heading" className="team-section__title">
          Your venues
        </h2>
        <p role="status">Loading venues…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="team-section" aria-labelledby="venue-list-heading">
        <h2 id="venue-list-heading" className="team-section__title">
          Your venues
        </h2>
        <div role="alert">
          <p>Unable to load venues.</p>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (venues.length === 0) {
    return (
      <section className="team-section" aria-labelledby="venue-list-heading">
        <h2 id="venue-list-heading" className="team-section__title">
          Your venues
        </h2>
        <p className="team-section__empty">No venues found.</p>
      </section>
    );
  }

  return (
    <section className="team-section" aria-labelledby="venue-list-heading">
      <h2 id="venue-list-heading" className="team-section__title">
        Your venues
      </h2>
      <table className="team-table" data-testid="venue-list-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Created</th>
            {canManage ? <th scope="col">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {venues.map((venue) => (
            <tr key={venue.id}>
              <td>{venue.name}</td>
              <td>{formatCreatedAt(venue.createdAt)}</td>
              {canManage ? (
                <td>
                  <div className="team-table__actions">
                    <button
                      type="button"
                      data-testid={`edit-venue-${venue.id}`}
                      onClick={() => onEdit(venue)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-venue-${venue.id}`}
                      onClick={() => onDelete(venue)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
