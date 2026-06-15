import { formatMoney } from '@/lib/money';
import type { LedgerGridResponse } from '@/types/generated-api';
import { BlockSection } from './BlockSection';

interface LedgerGridProps {
  ledger: LedgerGridResponse;
  onProformaChange?: (id: string, value: string) => void;
  onSettlementChange?: (id: string, value: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onLockBudget?: () => void;
  lockBudgetPending?: boolean;
  canLockBudget?: boolean;
}

export function LedgerGrid({
  ledger,
  onProformaChange,
  onSettlementChange,
  onNotesChange,
  onLockBudget,
  lockBudgetPending = false,
  canLockBudget = true,
}: LedgerGridProps) {
  const blocks = ledger.blocks ?? [];
  const artists = ledger.artists ?? [];
  const summary = ledger.summary;
  const status = ledger.status ?? 'PRE_SHOW';
  const hasVarianceAlerts = blocks.some((block) =>
    (block.rows ?? []).some((row) => row.varianceFlagged),
  );
  const isReconciled = status === 'RECONCILED';
  const editability = ledger.editability ?? {
    proforma: 'locked',
    settlement: 'locked',
    qboActuals: 'locked',
  };

  return (
    <div className="ledger-grid" data-testid="ledger-grid">
      <header className="ledger-grid__header">
        <div>
          <h2>{ledger.title}</h2>
          <p className="ledger-grid__meta">
            {ledger.eventDate} · {status.replace('_', '-')}
            {ledger.isBudgetLocked ? ' · Budget locked' : ''}
          </p>
        </div>
        {!ledger.isBudgetLocked && status === 'PRE_SHOW' && (
          <button
            type="button"
            className="ledger-grid__lock-btn"
            data-testid="lock-budget-btn"
            disabled={!canLockBudget || lockBudgetPending}
            onClick={onLockBudget}
          >
            {lockBudgetPending ? 'Locking…' : 'Lock Budget'}
          </button>
        )}
      </header>

      {isReconciled && hasVarianceAlerts && (
        <div
          className="ledger-grid__variance-banner"
          data-testid="variance-banner"
          role="alert"
        >
          Non-zero variances detected — review reconciliation before closing.
        </div>
      )}

      <div className="ledger-grid__summary" data-testid="ledger-summary">
        <span>Gross: {formatMoney(summary?.grossRevenue)}</span>
        <span>Deductions: {formatMoney(summary?.totalDeductions)}</span>
        <span>Net: {formatMoney(summary?.netShowRevenue)}</span>
      </div>

      {blocks.map((block) => (
        <BlockSection
          key={block.blockType}
          block={block}
          editability={editability}
          onProformaChange={onProformaChange}
          onSettlementChange={onSettlementChange}
          onNotesChange={onNotesChange}
        />
      ))}

      <section className="ledger-grid__artists" data-testid="artist-payouts">
        <h3>Artist Payouts</h3>
        <ul>
          {artists.map((artist) => (
            <li key={artist.id} data-testid={`artist-payout-${artist.id}`}>
              {artist.artistName}: {formatMoney(artist.calculatedNetPayout)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
