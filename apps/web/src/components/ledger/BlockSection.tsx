import { formatMoney } from '@/lib/money';
import type { EditabilityDto, LedgerBlockDto } from '@/types/generated-api';
import { LedgerRow } from './LedgerRow';

const BLOCK_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  EXPENSES: 'Expenses',
  DEAL_MATH: 'Deal Math',
};

interface BlockSectionProps {
  block: LedgerBlockDto;
  editability: EditabilityDto;
  onProformaChange?: (id: string, value: string) => void;
  onSettlementChange?: (id: string, value: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
}

export function BlockSection({
  block,
  editability,
  onProformaChange,
  onSettlementChange,
  onNotesChange,
}: BlockSectionProps) {
  const label = BLOCK_LABELS[block.blockType] ?? block.blockType;

  return (
    <section
      className="block-section"
      data-testid={`block-${block.blockType}`}
      aria-label={`${label} block`}
    >
      <h3 className="block-section__title">{label}</h3>
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Proforma</th>
            <th>Settlement</th>
            <th>QBO Actual</th>
            <th>Variance</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <LedgerRow
              key={row.id}
              row={row}
              editability={editability}
              onProformaChange={onProformaChange}
              onSettlementChange={onSettlementChange}
              onNotesChange={onNotesChange}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="block-section__totals">
            <td>Totals</td>
            <td>{formatMoney(block.blockTotals.proforma ?? '0.00')}</td>
            <td>{formatMoney(block.blockTotals.settlement ?? '0.00')}</td>
            <td>{formatMoney(block.blockTotals.qboActual ?? '0.00')}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
