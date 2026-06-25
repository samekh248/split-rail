import type { VenueRegionSection } from '@/lib/venueListView';
import type { VenueResponse } from '@/types/generated-api';

export interface VenueListGroupedProps {
  sections: VenueRegionSection[];
  canManage?: boolean;
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

export function VenueListGrouped({
  sections,
  canManage = false,
  onEdit,
  onDelete,
}: VenueListGroupedProps) {
  return (
    <div className="venues-grouped-list" data-testid="venues-grouped-list">
      {sections.map((section) => (
        <section
          key={section.sectionKey}
          className="venues-group"
          data-testid={`venues-region-section-${section.sectionKey}`}
          aria-labelledby={`venues-region-heading-${section.sectionKey}`}
        >
          <h2 id={`venues-region-heading-${section.sectionKey}`} className="venues-group__heading">
            {section.title}
          </h2>

          {section.venues.length === 0 ? (
            <p
              className="venues-group__empty"
              data-testid={`venues-region-empty-${section.sectionKey}`}
            >
              No venues
            </p>
          ) : (
            <div className="venues-list__table-wrap">
              <table className="venues-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Created</th>
                    {canManage ? <th scope="col">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {section.venues.map((venue) => (
                    <tr key={venue.id}>
                      <td>
                        <span className="venues-table__name">{venue.name}</span>
                      </td>
                      <td className="venues-table__date">{formatCreatedAt(venue.createdAt)}</td>
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
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
