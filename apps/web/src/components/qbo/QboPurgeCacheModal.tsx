import { useQboPurgeCache } from '@/api/qbo';

export interface QboPurgeCacheModalProps {
  venueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QboPurgeCacheModal({ venueId, onSuccess, onCancel }: QboPurgeCacheModalProps) {
  const purgeMutation = useQboPurgeCache(venueId);

  return (
    <div className="modal-backdrop" role="presentation" data-testid="qbo-purge-modal">
      <div className="modal" role="dialog" aria-labelledby="qbo-purge-title">
        <h3 id="qbo-purge-title">Clear cached QuickBooks data?</h3>
        <p>
          Are you sure you want to permanently clear all cached QuickBooks transaction mappings
          from Split-Rail? This will wipe out all historical variance metrics.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn-outline" disabled={purgeMutation.isPending} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            data-testid="qbo-purge-confirm"
            disabled={purgeMutation.isPending}
            onClick={() => {
              purgeMutation.mutate(undefined, { onSuccess });
            }}
          >
            Clear Cached QBO Data
          </button>
        </div>
      </div>
    </div>
  );
}
