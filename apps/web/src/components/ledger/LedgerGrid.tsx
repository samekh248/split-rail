import { formatMoney } from '@/lib/money';
import { formatEventDateRange } from '@/lib/eventDateRange';
import { resolveVarianceDisplay } from '@/lib/ledgerVariance';
import type { CreateLineItemRequest, LedgerGridResponse } from '@/types/generated-api';
import type { MoveDirection } from '@/lib/reorderLineItems';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { PinToggleButton } from '@/components/PinToggleButton';
import { BlockSection } from './BlockSection';

interface LedgerEventPinProps {
  isPinned: boolean;
  onToggle: () => void;
}

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
  /** Rendered after Lock Budget so kebab menus stay rightmost. */
  trailingHeaderActions?: ReactNode;
  /** When true, omits the event title/meta row (e.g. festival workspace shows them in FestivalModeCard). */
  hideEventHeader?: boolean;
  /** Pin control inline on the event meta row (standard events only). */
  eventPin?: LedgerEventPinProps;
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
  trailingHeaderActions,
  hideEventHeader = false,
  eventPin,
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
  const hasHeaderActions =
    showLockBudget || headerActions != null || trailingHeaderActions != null;

  return (
    <div className="ledger-grid" data-testid="ledger-grid">
      <header className="ledger-grid__hero">
        {!hideEventHeader ? (
          <div className="ledger-grid__event-header">
            <h2 className="ledger-grid__title">{ledger.title}</h2>
            <p className="ledger-grid__meta" data-testid="ledger-event-meta">
              <span>
                {formatEventDateRange(ledger.eventDate, ledger.endDate)} · {status.replace('_', '-')}
                {ledger.isBudgetLocked ? ' · Budget locked' : ''}
              </span>
              {eventPin ? (
                <PinToggleButton
                  pinned={eventPin.isPinned}
                  pinnedLabel="Unpin event"
                  unpinnedLabel="Pin event"
                  testId={`ledger-pin-${ledger.eventId ?? ''}`}
                  onToggle={eventPin.onToggle}
                />
              ) : null}
            </p>
          </div>
        ) : null}

        <div
          className="ledger-grid__summary-header section-header"
          data-testid="workspace-focus-sync"
        >
          <h3 className="ledger-grid__summary-title">Summary</h3>
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
              {trailingHeaderActions}
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
