import { type ReactNode, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { KebabMenu } from '@/components/shell/KebabMenu';
import { useReassignVenueRegion } from '@/api/venues';
import type { VenueRegionSection } from '@/lib/venueListView';
import type { VenueResponse } from '@/types/generated-api';

export interface VenueListGroupedProps {
  sections: VenueRegionSection[];
  canManage?: boolean;
  onEdit: (venue: VenueResponse) => void;
  onAddVenue?: (regionId: string) => void;
  editingRegionId?: string | null;
  regionEditor?: ReactNode;
  onEditRegion?: (regionId: string) => void;
  onDeleteRegion?: (regionId: string) => void;
}

interface DraggedVenue {
  id: string;
  name: string;
  regionId: string | null;
}

function sectionRegionId(sectionKey: string): string | null {
  return sectionKey === 'unassigned' ? null : sectionKey;
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
  onAddVenue,
  editingRegionId = null,
  regionEditor,
  onEditRegion,
  onDeleteRegion,
}: VenueListGroupedProps) {
  const reassignVenueRegion = useReassignVenueRegion();
  const [draggedVenue, setDraggedVenue] = useState<DraggedVenue | null>(null);
  const [pendingVenueId, setPendingVenueId] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [dragOverSectionKey, setDragOverSectionKey] = useState<string | null>(null);

  const handleDragStart =
    (venue: VenueResponse, currentRegionId: string | null, isPending: boolean) =>
    (event: React.DragEvent<HTMLSpanElement>) => {
      if (isPending) {
        event.preventDefault();
        return;
      }
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        const row = event.currentTarget.closest('tr');
        if (row) {
          const rowRect = row.getBoundingClientRect();
          event.dataTransfer.setDragImage(
            row,
            event.clientX - rowRect.left,
            event.clientY - rowRect.top,
          );
        }
      }
      setDragError(null);
      setDraggedVenue({ id: venue.id ?? '', name: venue.name ?? '', regionId: currentRegionId });
    };

  const handleDragEnd = () => {
    setDraggedVenue(null);
    setDragOverSectionKey(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!draggedVenue) {
      return;
    }
    event.preventDefault();
  };

  const handleDragEnter =
    (sectionKey: string) => (event: React.DragEvent<HTMLElement>) => {
      if (!draggedVenue) {
        return;
      }
      event.preventDefault();
      setDragOverSectionKey(sectionKey);
    };

  const handleDragLeave =
    (sectionKey: string) => (event: React.DragEvent<HTMLElement>) => {
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
        return;
      }
      setDragOverSectionKey((current) => (current === sectionKey ? null : current));
    };

  const handleDrop = (targetSectionKey: string) => (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOverSectionKey(null);
    if (!draggedVenue) {
      return;
    }
    const targetRegionId = sectionRegionId(targetSectionKey);
    const dragged = draggedVenue;
    setDraggedVenue(null);
    if (targetRegionId === dragged.regionId) {
      return;
    }
    setPendingVenueId(dragged.id);
    reassignVenueRegion.mutate(
      { venueId: dragged.id, name: dragged.name, regionId: targetRegionId },
      {
        onSuccess: () => setPendingVenueId(null),
        onError: () => {
          setPendingVenueId(null);
          setDragError('Unable to move venue. Please try again.');
        },
      },
    );
  };

  return (
    <div className="venues-grouped-list" data-testid="venues-grouped-list">
      {dragError ? (
        <p className="venue-drag-error" role="alert" data-testid="venue-drag-error">
          {dragError}
        </p>
      ) : null}
      {sections.map((section) => {
        const isDropTarget = dragOverSectionKey === section.sectionKey;
        const isEditingRegion = editingRegionId === section.sectionKey;
        const regionMenuItems = [
          ...(onEditRegion
            ? [
                {
                  label: 'Edit region',
                  icon: faPen,
                  testId: `edit-region-${section.sectionKey}`,
                  onSelect: () => onEditRegion(section.sectionKey),
                },
              ]
            : []),
          ...(onDeleteRegion
            ? [
                {
                  label: 'Delete region',
                  icon: faTrash,
                  destructive: true,
                  testId: `delete-region-${section.sectionKey}`,
                  onSelect: () => onDeleteRegion(section.sectionKey),
                },
              ]
            : []),
        ];
        const dropTargetProps = {
          onDragEnter: handleDragEnter(section.sectionKey),
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave(section.sectionKey),
          onDrop: handleDrop(section.sectionKey),
        };

        return (
          <div
            key={section.sectionKey}
            className={
              section.sectionKey === 'unassigned'
                ? 'venues-group venues-group--unassigned'
                : 'venues-group'
            }
            data-testid={`venues-region-section-${section.sectionKey}`}
          >
            <div className="venues-group__header">
              {isEditingRegion && regionEditor ? (
                regionEditor
              ) : (
                <h2 className="venues-group__heading">{section.title}</h2>
              )}
              {canManage && section.sectionKey !== 'unassigned' ? (
                <div className="venues-group__actions">
                  {onAddVenue ? (
                    <button
                      type="button"
                      className="venues-group__add btn-primary--compact btn-icon-label"
                      data-testid={`venues-add-venue-${section.sectionKey}`}
                      onClick={() => onAddVenue(section.sectionKey)}
                    >
                      <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                      Add venue
                    </button>
                  ) : null}
                  {!isEditingRegion && regionMenuItems.length > 0 ? (
                    <KebabMenu
                      ariaLabel={`Region actions for ${section.title}`}
                      testId={`venues-region-menu-${section.sectionKey}`}
                      items={regionMenuItems}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            {section.venues.length === 0 ? (
              <p
                className={
                  isDropTarget ? 'venues-group__empty venues-drop-target' : 'venues-group__empty'
                }
                data-testid={`venues-region-empty-${section.sectionKey}`}
                {...dropTargetProps}
              >
                No venues
              </p>
            ) : (
              <div
                className={
                  isDropTarget
                    ? 'venues-list__table-wrap venues-drop-target'
                    : 'venues-list__table-wrap'
                }
                data-testid={`venues-region-table-${section.sectionKey}`}
                {...dropTargetProps}
              >
                <table className="venues-table">
                  <thead>
                    <tr>
                      {canManage ? (
                        <th scope="col" className="venues-table__handle-col" aria-hidden="true" />
                      ) : null}
                      <th scope="col">Name</th>
                      <th scope="col">Created</th>
                      {canManage ? (
                        <th scope="col" className="venues-table__actions-col">
                          Actions
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {section.venues.map((venue) => {
                      const isPending = pendingVenueId === venue.id;
                      return (
                        <tr
                          key={venue.id}
                          className={isPending ? 'venues-table__row--pending' : undefined}
                        >
                          {canManage ? (
                            <td className="venues-table__handle-cell">
                              <span
                                className="venue-drag-handle"
                                role="presentation"
                                draggable={!isPending}
                                onDragStart={handleDragStart(
                                  venue,
                                  sectionRegionId(section.sectionKey),
                                  isPending,
                                )}
                                onDragEnd={handleDragEnd}
                                data-testid={`venue-drag-handle-${venue.id}`}
                              >
                                <FontAwesomeIcon icon={faGripVertical} aria-hidden="true" />
                              </span>
                            </td>
                          ) : null}
                          <td>
                            <span className="venues-table__name">{venue.name}</span>
                          </td>
                          <td className="venues-table__date">
                            {formatCreatedAt(venue.createdAt)}
                          </td>
                          {canManage ? (
                            <td>
                              <div className="team-table__actions">
                                <button
                                  type="button"
                                  className="btn-icon-label"
                                  data-testid={`edit-venue-${venue.id}`}
                                  onClick={() => onEdit(venue)}
                                >
                                  <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                                  Edit
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
