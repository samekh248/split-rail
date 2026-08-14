import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { ModalHeader } from '@/components/shell/ModalHeader';
import type { BlockConflictInfo } from '@/components/festival/conflictTypes';

export interface ConflictDialogProps {
  open: boolean;
  attemptedBlock: { id?: string; title?: string | null };
  conflict: BlockConflictInfo;
  onClose: () => void;
  onReschedule: () => void;
  onEditExisting: (conflictingBlockId: string) => void;
  onCancelOrMove: (conflictingBlockId: string) => void;
}

export function ConflictDialog({
  open,
  attemptedBlock,
  conflict,
  onClose,
  onReschedule,
  onEditExisting,
  onCancelOrMove,
}: ConflictDialogProps) {
  if (!open) {
    return null;
  }

  const timeRange =
    conflict.conflictingStartTime && conflict.conflictingEndTime
      ? `${conflict.conflictingStartTime} to ${conflict.conflictingEndTime}`
      : null;

  return (
    <div className="conflict-dialog__backdrop" onClick={onClose} role="presentation">
      <div
        className="conflict-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        data-testid="conflict-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Schedule conflict"
          titleId="conflict-dialog-title"
          onClose={onClose}
        />

        <div className="conflict-dialog__body">
          <p className="conflict-dialog__intro">
            <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
            Could not place &ldquo;{attemptedBlock.title}&rdquo; in that slot.
          </p>
          <p className="conflict-dialog__detail">
            <strong>{conflict.conflictingBlockTitle}</strong>
            {timeRange ? <> already occupies this stage from {timeRange}.</> : <> {conflict.message}</>}
          </p>
        </div>

        <div className="conflict-dialog__actions">
          <button type="button" className="btn-primary" onClick={onReschedule}>
            Pick a new time
          </button>
          {conflict.conflictingBlockId ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onEditExisting(conflict.conflictingBlockId!)}
              >
                Edit existing block
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onCancelOrMove(conflict.conflictingBlockId!)}
              >
                Cancel or move conflicting block
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onReschedule}>
                Edit existing block
              </button>
              <button type="button" className="btn-secondary" onClick={onReschedule}>
                Cancel or move conflicting block
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
