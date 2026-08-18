import { formatMoney } from '@/lib/money';
import { formatIsoDateRange } from '@/lib/eventDateRange';
import { resolveVarianceDisplay } from '@/lib/ledgerVariance';
import type { CreateLineItemRequest, LedgerGridResponse } from '@/types/generated-api';
import type { MoveDirection } from '@/lib/reorderLineItems';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { BlockSection } from './BlockSection';

interface LedgerGridProps {
  ledger: LedgerGridResponse;
  canEditStructure?: boolean;
  onProformaChange?: (id: string, value: string) => void;
  onSettlementChange?: (id: string, value: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDeductionChange?: (id: string, isDeduction: boolean) => void;
  onDeleteLineItem?: (id: string, label: string) => void;
  onMoveLineItem?: (id: string, direction: MoveDirection) => void;
  onAddLineItem?: (request: CreateLineItemRequest) => Promise<void>;
  onLockBudget?: () => void;
  lockBudgetPending?: boolean;
  canLockBudget?: boolean;
  headerActions?: ReactNode;
}

export function LedgerGrid({
  ledger,
  canEditStructure = false,
  onProformaChange,
  onSettlementChange,
  onNotesChange,
  onLabelChange,
  onDeductionChange,
  onDeleteLineItem,
  onMoveLineItem,
  onAddLineItem,
  onLockBudget,
  lockBudgetPending = false,
  canLockBudget = true,
  headerActions,
}: LedgerGridProps) {
  const blocks = ledger.blocks ?? [];
  const summary = ledger.summary;
  const status = ledger.status ?? 'PRE_SHOW';
  const showQboColumns = blocks.some((block) =>
    (block.rows ?? []).some((row) => Object.prototype.hasOwnProperty.call(row, 'qboActualValue')) ||
    Object.prototype.hasOwnProperty.call(block.blockTotals ?? {}, 'qboActual'),
  );
  const hasVarianceAlerts = showQboColumns && blocks.some((block) =>
    (block.rows ?? []).some((row) =>
      resolveVarianceDisplay({
        qboActual: row.qboActualValue,
        settlement: row.settlementValue,
        serverVariance: row.variance,
      }).flagged,
    ),
  );
  const isReconciled = status === 'RECONCILED';
  const editability = ledger.editability ?? {
    proforma: 'locked',
    settlement: 'locked',
    qboActuals: 'locked',
  };
  const showLockBudget = !ledger.isBudgetLocked && status === 'PRE_SHOW';
  const hasHeaderActions = showLockBudget || headerActions != null;

  return (
    <div className="ledger-grid" data-testid="ledger-grid">
      <header className="ledger-grid__hero">
        <div className="ledger-grid__header section-header" data-testid="workspace-focus-sync">
          <div>
            <h2 className="ledger-grid__title">{ledger.title}</h2>
            <p className="ledger-grid__meta">
              {formatIsoDateRange(ledger.eventDate, ledger.endDate)} · {status.replace('_', '-')}
              {ledger.isBudgetLocked ? ' · Budget locked' : ''}
            </p>
          </div>
          {hasHeaderActions ? (
            <div className="section-header__actions">
              {headerActions}
              {showLockBudget ? (
                <button
                  type="button"
                  className="ledger-grid__lock-btn btn-primary--compact btn-icon-label"
                  data-testid="lock-budget-btn"
                  disabled={!canLockBudget || lockBudgetPending}
                  onClick={onLockBudget}
                >
                  {!lockBudgetPending ? <FontAwesomeIcon icon={faLock} aria-hidden="true" /> : null}
                  {lockBudgetPending ? 'Locking…' : 'Lock Budget'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ledger-grid__summary" data-testid="ledger-summary">
          <div className="ledger-grid__summary-item">
            <span className="ledger-grid__summary-label">Gross</span>
            <span className="ledger-grid__summary-value">{formatMoney(summary?.grossRevenue)}</span>
          </div>
          <div className="ledger-grid__summary-item">
            <span className="ledger-grid__summary-label">Deductions</span>
            <span className="ledger-grid__summary-value">
              {formatMoney(summary?.totalDeductions)}
            </span>
          </div>
          <div className="ledger-grid__summary-item">
            <span className="ledger-grid__summary-label">Net</span>
            <span className="ledger-grid__summary-value">
              {formatMoney(summary?.netShowRevenue)}
            </span>
          </div>
        </div>
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

      <div className="ledger-grid__blocks">
        {blocks.map((block) => (
          <BlockSection
            key={block.blockType}
            block={block}
            editability={editability}
            isBudgetLocked={ledger.isBudgetLocked ?? false}
            canEditStructure={canEditStructure}
            showQboColumns={showQboColumns}
            onProformaChange={onProformaChange}
            onSettlementChange={onSettlementChange}
            onNotesChange={onNotesChange}
            onLabelChange={onLabelChange}
            onDeductionChange={onDeductionChange}
            onDeleteLineItem={onDeleteLineItem}
            onMoveLineItem={onMoveLineItem}
            onAddLineItem={onAddLineItem}
          />
        ))}
      </div>
    </div>
  );
}
