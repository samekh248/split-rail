import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import type { FestivalQboTransactionResponse } from '@/types/generated-api';

export interface TransactionMappingDrawerProps {
  open: boolean;
  transaction: FestivalQboTransactionResponse | null;
  onClose: () => void;
  onResolve?: (resolution: string, reason: string) => void;
  resolving?: boolean;
  canManage?: boolean;
}

function reviewChipClass(reviewState?: string | null): string {
  const normalized = (reviewState ?? 'NONE').toUpperCase();
  if (normalized === 'NONE') {
    return 'festival-qbo-chip festival-qbo-chip--clear';
  }
  return 'festival-qbo-chip festival-qbo-chip--review';
}

export function TransactionMappingDrawer({
  open,
  transaction,
  onClose,
  onResolve,
  resolving = false,
  canManage = false,
}: TransactionMappingDrawerProps) {
  if (!open || !transaction) {
    return null;
  }

  const requiresReview = (transaction.reviewState ?? 'NONE') !== 'NONE';
  const blockedFromSettlement = requiresReview;

  return (
    <div className="transaction-mapping__backdrop" onClick={onClose} role="presentation">
      <aside
        className="transaction-mapping"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-mapping-title"
        data-testid="transaction-mapping-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="transaction-mapping__header">
          <h2 id="transaction-mapping-title">QBO transaction mapping</h2>
          <button type="button" className="team-modal__cancel" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="transaction-mapping__meta">
          <span className={reviewChipClass(transaction.reviewState)} data-testid="qbo-review-chip">
            {requiresReview ? (
              <>
                <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" /> Review required
              </>
            ) : (
              'Clear'
            )}
          </span>
          <p>
            {transaction.qboAccountName} · {transaction.qboTransactionId} · ${transaction.amount}
          </p>
          <p data-testid="qbo-remaining-overhead">
            Remaining at overhead: ${transaction.remainingAtOverhead}
          </p>
        </div>

        <section className="transaction-mapping__compare" data-testid="qbo-mapping-compare">
          <h3>Original vs. current mapping</h3>
          <div className="transaction-mapping__columns">
            <div>
              <h4>Original reference</h4>
              <p>{transaction.qboTransactionId}</p>
              <p>{transaction.masterTag}</p>
            </div>
            <div>
              <h4>Current allocations</h4>
              <ul>
                {(transaction.allocations ?? []).map((line) => (
                  <li key={line.allocationId}>
                    {line.targetType} · ${line.amount}
                    {line.countsTowardSettlement ? ' · settlement' : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {blockedFromSettlement ? (
          <p className="transaction-mapping__blocked" data-testid="qbo-settlement-blocked">
            Settlement-marked splits are blocked until this review state is resolved.
          </p>
        ) : null}

        {canManage && requiresReview ? (
          <div className="transaction-mapping__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={resolving}
              onClick={() => onResolve?.('AcceptAsOverhead', 'Accepted as festival overhead')}
            >
              Accept as overhead
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
