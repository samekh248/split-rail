import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { useDeleteRegion, useRegions } from '@/api/regions';
import type { RegionResponse } from '@/types/generated-api';

export interface RegionDeleteResolutionModalProps {
  region: RegionResponse;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

type ResolutionChoice = 'delete-venues' | 'move-venues';

function mapDeleteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to delete this region.';
  }
  if (message.includes('404')) {
    return 'Region or destination region not found.';
  }
  return 'Unable to delete region. Please try again.';
}

export function RegionDeleteResolutionModal({
  region,
  open,
  onClose,
  onDeleted,
}: RegionDeleteResolutionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const deleteRegion = useDeleteRegion();
  const { data: regions = [] } = useRegions();
  const [choice, setChoice] = useState<ResolutionChoice | null>(null);
  const [destinationRegionId, setDestinationRegionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const destinationOptions = regions.filter((candidate) => candidate.id !== region.id);
  const canMoveVenues = destinationOptions.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    setChoice(null);
    setDestinationRegionId('');
    setError(null);

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isPending = deleteRegion.isPending;
  const canConfirm =
    choice === 'delete-venues' || (choice === 'move-venues' && destinationRegionId !== '');

  const handleConfirm = async () => {
    if (!region.id || !canConfirm) {
      return;
    }
    setError(null);
    try {
      await deleteRegion.mutateAsync(
        choice === 'delete-venues'
          ? { regionId: region.id, deleteVenues: true }
          : { regionId: region.id, moveVenuesToRegionId: destinationRegionId },
      );
      onDeleted();
      onClose();
    } catch (caught) {
      setError(mapDeleteError(caught));
    }
  };

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-delete-resolution-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        data-testid="region-delete-resolution-modal"
      >
        <ModalHeader
          title={`Delete ${region.name ?? 'region'}?`}
          titleId="region-delete-resolution-title"
          onClose={onClose}
          closeDisabled={isPending}
        />
        <p className="team-confirm__text">
          This region still has venues assigned to it. Choose what should happen to them before it
          can be deleted.
        </p>
        {error ? (
          <p className="team-modal__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="region-delete-resolution__choices">
          <label className="region-delete-resolution__choice">
            <input
              type="radio"
              name="region-delete-choice"
              value="delete-venues"
              checked={choice === 'delete-venues'}
              onChange={() => setChoice('delete-venues')}
              disabled={isPending}
              data-testid="region-delete-choice-delete-venues"
            />
            Delete the venues too
          </label>
          {canMoveVenues ? (
            <label className="region-delete-resolution__choice">
              <input
                type="radio"
                name="region-delete-choice"
                value="move-venues"
                checked={choice === 'move-venues'}
                onChange={() => setChoice('move-venues')}
                disabled={isPending}
                data-testid="region-delete-choice-move-venues"
              />
              Move venues to another region
            </label>
          ) : null}
          {choice === 'move-venues' ? (
            <select
              className="region-delete-resolution__destination"
              value={destinationRegionId}
              onChange={(event) => setDestinationRegionId(event.target.value)}
              disabled={isPending}
              data-testid="region-delete-destination"
            >
              <option value="">Select a region</option>
              {destinationOptions.map((option) => (
                <option key={option.id} value={option.id ?? ''}>
                  {option.name ?? 'Unnamed region'}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="team-modal__actions team-modal__actions--split">
          <button type="button" className="btn-secondary" disabled={isPending} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary--compact btn-primary--danger btn-icon-label"
            data-testid="region-delete-resolution-confirm"
            onClick={() => void handleConfirm()}
            disabled={isPending || !canConfirm}
          >
            {isPending ? null : <FontAwesomeIcon icon={faTrash} aria-hidden="true" />}
            {isPending ? 'Deleting…' : 'Delete region'}
          </button>
        </div>
      </div>
    </div>
  );
}
