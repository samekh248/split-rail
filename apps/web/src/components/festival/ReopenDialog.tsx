import { useState } from 'react';

export interface ReopenDialogProps {
  open: boolean;
  requiresDispatchAcknowledgement?: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reasonCode: string;
    note: string;
    acknowledgeDispatched: boolean;
  }) => void;
}

export function ReopenDialog({
  open,
  requiresDispatchAcknowledgement = false,
  pending = false,
  onClose,
  onConfirm,
}: ReopenDialogProps) {
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [acknowledgeDispatched, setAcknowledgeDispatched] = useState(false);

  if (!open) {
    return null;
  }

  const canSubmit =
    reasonCode.trim().length > 0
    && note.trim().length > 0
    && (!requiresDispatchAcknowledgement || acknowledgeDispatched);

  return (
    <div className="reopen-dialog" role="dialog" aria-modal="true" data-testid="reopen-dialog">
      <div className="reopen-dialog__panel">
        <h2 className="reopen-dialog__title">Reopen settlement</h2>
        <label className="reopen-dialog__field">
          Reason code
          <input
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            aria-label="Reason code"
          />
        </label>
        <label className="reopen-dialog__field">
          Note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-label="Reopen note"
          />
        </label>
        {requiresDispatchAcknowledgement ? (
          <label className="reopen-dialog__ack">
            <input
              type="checkbox"
              checked={acknowledgeDispatched}
              onChange={(event) => setAcknowledgeDispatched(event.target.checked)}
            />
            I acknowledge this settlement document was already dispatched.
          </label>
        ) : null}
        <div className="reopen-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary reopen-dialog__confirm"
            disabled={!canSubmit || pending}
            onClick={() =>
              onConfirm({
                reasonCode: reasonCode.trim(),
                note: note.trim(),
                acknowledgeDispatched,
              })}
          >
            Reopen
          </button>
        </div>
      </div>
    </div>
  );
}
