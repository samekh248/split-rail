export interface QboDisconnectModalProps {
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function QboDisconnectModal({ pending, onConfirm, onCancel }: QboDisconnectModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" data-testid="qbo-disconnect-modal">
      <div className="modal" role="dialog" aria-labelledby="qbo-disconnect-title">
        <h3 id="qbo-disconnect-title">Disconnect QuickBooks?</h3>
        <p>
          Active credentials will be revoked and scheduled sync suspended. Cached transaction
          feeds and variance logs remain as frozen snapshots until you purge them.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn-outline" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            data-testid="qbo-disconnect-confirm"
            disabled={pending}
            onClick={onConfirm}
          >
            Disconnect Account
          </button>
        </div>
      </div>
    </div>
  );
}
