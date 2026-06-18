import { formatMoney, parseMoneyInput } from '@/lib/money';
import type { EditabilityDto, LineItemDto } from '@/types/generated-api';
import type { MoveDirection } from '@/lib/reorderLineItems';
import { canMoveRow } from '@/lib/reorderLineItems';
import { VarianceCell } from './VarianceCell';

interface LedgerRowProps {
  row: LineItemDto;
  editability: EditabilityDto;
  blockType?: string;
  canEditStructure?: boolean;
  blockRows?: LineItemDto[];
  onProformaChange?: (id: string, value: string) => void;
  onSettlementChange?: (id: string, value: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDeductionChange?: (id: string, isDeduction: boolean) => void;
  onDeleteLineItem?: (id: string, label: string) => void;
  onMoveLineItem?: (id: string, direction: MoveDirection) => void;
}

function isEditable(level: string | null | undefined): boolean {
  return level === 'editable';
}

export function LedgerRow({
  row,
  editability,
  blockType,
  canEditStructure = false,
  blockRows = [],
  onProformaChange,
  onSettlementChange,
  onNotesChange,
  onLabelChange,
  onDeductionChange,
  onDeleteLineItem,
  onMoveLineItem,
}: LedgerRowProps) {
  const proformaEditable = isEditable(editability.proforma);
  const settlementEditable = isEditable(editability.settlement);
  const isExpense = blockType === 'EXPENSES';
  const isDeduction = isExpense && (row.isArtistDeduction ?? false);
  const showDeductionToggle = canEditStructure && isExpense;

  const handleMoneyBlur = (
    raw: string,
    onChange?: (id: string, value: string) => void,
  ) => {
    if (!onChange || !row.id) return;
    const parsed = parseMoneyInput(raw);
    if (parsed !== null) {
      onChange(row.id, parsed);
    }
  };

  const handleLabelBlur = (raw: string) => {
    if (!onLabelChange || !row.id) return;
    const trimmed = raw.trim();
    if (trimmed && trimmed !== row.rowLabel) {
      onLabelChange(row.id, trimmed);
    }
  };

  const handleDelete = () => {
    if (!onDeleteLineItem || !row.id) return;
    const label = row.rowLabel ?? 'this row';
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      onDeleteLineItem(row.id, label);
    }
  };

  const rowClassName = isDeduction ? 'ledger-row ledger-row--deduction' : 'ledger-row';

  return (
    <tr className={rowClassName} data-row-id={row.id}>
      <td className="ledger-row__label">
        {canEditStructure ? (
          <input
            type="text"
            className="ledger-input"
            defaultValue={row.rowLabel ?? ''}
            aria-label={`Label ${row.rowLabel}`}
            data-testid={`label-edit-${row.id}`}
            onBlur={(event) => handleLabelBlur(event.target.value)}
          />
        ) : (
          row.rowLabel
        )}
        {isDeduction && (
          <span
            className="ledger-row__deduction-badge"
            data-testid={`deduction-badge-${row.id}`}
          >
            Deduction
          </span>
        )}
        {showDeductionToggle && (
          <label className="ledger-row__deduction">
            <input
              type="checkbox"
              key={`${row.id}-${row.rowVersion ?? ''}`}
              checked={row.isArtistDeduction ?? false}
              aria-label={`Artist deduction ${row.rowLabel}`}
              data-testid={`deduction-${row.id}`}
              onChange={(event) =>
                row.id && onDeductionChange?.(row.id, event.target.checked)
              }
            />
            Flag as deduction
          </label>
        )}
      </td>
      <td className="ledger-row__proforma">
        {proformaEditable ? (
          <input
            type="text"
            className="ledger-input"
            defaultValue={row.proformaValue}
            aria-label={`Proforma ${row.rowLabel}`}
            data-testid={`proforma-${row.id}`}
            onBlur={(e) => handleMoneyBlur(e.target.value, onProformaChange)}
          />
        ) : (
          <span data-testid={`proforma-readonly-${row.id}`}>
            {formatMoney(row.proformaValue)}
          </span>
        )}
      </td>
      <td className="ledger-row__settlement">
        {settlementEditable ? (
          <input
            type="text"
            className="ledger-input"
            defaultValue={row.settlementValue}
            aria-label={`Settlement ${row.rowLabel}`}
            data-testid={`settlement-${row.id}`}
            onBlur={(e) => handleMoneyBlur(e.target.value, onSettlementChange)}
          />
        ) : (
          <span data-testid={`settlement-readonly-${row.id}`}>
            {formatMoney(row.settlementValue)}
          </span>
        )}
      </td>
      <td className="ledger-row__qbo" data-testid={`qbo-${row.id}`}>
        {formatMoney(row.qboActualValue)}
      </td>
      <VarianceCell
        qboActual={row.qboActualValue}
        settlement={row.settlementValue}
        serverVariance={row.variance}
      />
      <td className="ledger-row__notes">
        {proformaEditable || settlementEditable ? (
          <input
            type="text"
            className="ledger-input ledger-input--notes"
            defaultValue={row.notes ?? ''}
            aria-label={`Notes ${row.rowLabel}`}
            data-testid={`notes-${row.id}`}
            onBlur={(e) => row.id && onNotesChange?.(row.id, e.target.value)}
          />
        ) : (
          row.notes
        )}
      </td>
      {canEditStructure && (
        <td className="ledger-row__actions">
          <button
            type="button"
            aria-label={`Move ${row.rowLabel} up`}
            data-testid={`move-up-${row.id}`}
            disabled={!row.id || !canMoveRow(blockRows, row.id, 'up')}
            onClick={() => row.id && onMoveLineItem?.(row.id, 'up')}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${row.rowLabel} down`}
            data-testid={`move-down-${row.id}`}
            disabled={!row.id || !canMoveRow(blockRows, row.id, 'down')}
            onClick={() => row.id && onMoveLineItem?.(row.id, 'down')}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Delete ${row.rowLabel}`}
            data-testid={`delete-row-${row.id}`}
            onClick={handleDelete}
          >
            Delete
          </button>
        </td>
      )}
    </tr>
  );
}
