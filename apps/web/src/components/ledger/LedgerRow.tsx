import { formatMoney, parseMoneyInput } from '@/lib/money';
import type { EditabilityDto, LineItemDto } from '@/types/generated-api';
import { VarianceCell } from './VarianceCell';

interface LedgerRowProps {
  row: LineItemDto;
  editability: EditabilityDto;
  onProformaChange?: (id: string, value: string) => void;
  onSettlementChange?: (id: string, value: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
}

function isEditable(level: string): boolean {
  return level === 'editable';
}

export function LedgerRow({
  row,
  editability,
  onProformaChange,
  onSettlementChange,
  onNotesChange,
}: LedgerRowProps) {
  const proformaEditable = isEditable(editability.proforma);
  const settlementEditable = isEditable(editability.settlement);

  const handleMoneyBlur = (
    raw: string,
    onChange?: (id: string, value: string) => void,
  ) => {
    if (!onChange) return;
    const parsed = parseMoneyInput(raw);
    if (parsed !== null) {
      onChange(row.id, parsed);
    }
  };

  return (
    <tr className="ledger-row" data-row-id={row.id}>
      <td className="ledger-row__label">{row.rowLabel}</td>
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
      <VarianceCell variance={row.variance} varianceFlagged={row.varianceFlagged} />
      <td className="ledger-row__notes">
        {proformaEditable || settlementEditable ? (
          <input
            type="text"
            className="ledger-input ledger-input--notes"
            defaultValue={row.notes ?? ''}
            aria-label={`Notes ${row.rowLabel}`}
            data-testid={`notes-${row.id}`}
            onBlur={(e) => onNotesChange?.(row.id, e.target.value)}
          />
        ) : (
          row.notes
        )}
      </td>
    </tr>
  );
}
