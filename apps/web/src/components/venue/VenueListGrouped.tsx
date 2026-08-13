import type { VenueRegionSection } from '@/lib/venueListView';
import type { VenueResponse } from '@/types/generated-api';

export interface VenueListGroupedProps {
  sections: VenueRegionSection[];
  canManage?: boolean;
  onEdit: (venue: VenueResponse) => void;
  onDelete: (venue: VenueResponse) => void;
  onAddVenue?: (regionId: string) => void;
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
  onAddVenue,
}: VenueListGroupedProps) {
  return (
    <div className="venues-grouped-list" data-testid="venues-grouped-list">
      {sections.map((section) => (
        <div
          key={section.sectionKey}
          className={
            section.sectionKey === 'unassigned' ? 'venues-group venues-group--unassigned' : 'venues-group'
          }
          data-testid={`venues-region-section-${section.sectionKey}`}
        >
          <div className="venues-group__header">
            <h2 className="venues-group__heading">{section.title}</h2>
            {canManage && onAddVenue && section.sectionKey !== 'unassigned' ? (
              <button
                type="button"
                className="venues-group__add btn-primary--compact"
                data-testid={`venues-add-venue-${section.sectionKey}`}
                onClick={() => onAddVenue(section.sectionKey)}
              >
                Add venue
              </button>
            ) : null}
          </div>

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
        </div>
      ))}
    </div>
  );
}
