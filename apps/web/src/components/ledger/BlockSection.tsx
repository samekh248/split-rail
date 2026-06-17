import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import { nextSortOrder } from '@/lib/reorderLineItems';
import type { CreateLineItemRequest, EditabilityDto, LedgerBlockDto } from '@/types/generated-api';
import type { MoveDirection } from '@/lib/reorderLineItems';
import { AddLineItemForm } from './AddLineItemForm';
import { LedgerRow } from './LedgerRow';

const BLOCK_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  EXPENSES: 'Expenses',
  DEAL_MATH: 'Deal Math',
};

const USER_MANAGED_BLOCKS = new Set(['REVENUE', 'EXPENSES']);

interface BlockSectionProps {
  block: LedgerBlockDto;
  editability: EditabilityDto;
  isBudgetLocked?: boolean;
  canEditStructure?: boolean;
  onProformaChange?: (id: string, value: string) => void;
  onSettlementChange?: (id: string, value: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDeductionChange?: (id: string, isDeduction: boolean) => void;
  onDeleteLineItem?: (id: string, label: string) => void;
  onMoveLineItem?: (id: string, direction: MoveDirection) => void;
  onAddLineItem?: (request: CreateLineItemRequest) => Promise<void>;
}

export function BlockSection({
  block,
  editability,
  isBudgetLocked = false,
  canEditStructure = false,
  onProformaChange,
  onSettlementChange,
  onNotesChange,
  onLabelChange,
  onDeductionChange,
  onDeleteLineItem,
  onMoveLineItem,
  onAddLineItem,
}: BlockSectionProps) {
  const blockType = block.blockType ?? '';
  const label = BLOCK_LABELS[blockType] ?? blockType ?? 'Block';
  const rows = block.rows ?? [];
  const totals = block.blockTotals;
  const showAddRow = canEditStructure && USER_MANAGED_BLOCKS.has(blockType);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <section
      className="block-section"
      data-testid={`block-${blockType}`}
      aria-label={`${label} block`}
    >
      <div className="block-section__header">
        <h3 className="block-section__title">{label}</h3>
        {showAddRow && (
          <button
            type="button"
            data-testid={`add-row-${blockType}`}
            onClick={() => setShowAddForm((open) => !open)}
          >
            Add row
          </button>
        )}
      </div>

      {showAddForm && onAddLineItem && (
        <AddLineItemForm
          blockType={blockType as 'REVENUE' | 'EXPENSES'}
          isBudgetLocked={isBudgetLocked}
          sortOrder={nextSortOrder(rows)}
          onSubmit={async (request) => {
            await onAddLineItem(request);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <table className="ledger-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Proforma</th>
            <th>Settlement</th>
            <th>QBO Actual</th>
            <th>Variance</th>
            <th>Notes</th>
            {canEditStructure && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LedgerRow
              key={row.id}
              row={row}
              blockType={blockType}
              editability={editability}
              canEditStructure={canEditStructure}
              blockRows={rows}
              onProformaChange={onProformaChange}
              onSettlementChange={onSettlementChange}
              onNotesChange={onNotesChange}
              onLabelChange={onLabelChange}
              onDeductionChange={onDeductionChange}
              onDeleteLineItem={onDeleteLineItem}
              onMoveLineItem={onMoveLineItem}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="block-section__totals">
            <td>Totals</td>
            <td>{formatMoney(totals?.proforma)}</td>
            <td>{formatMoney(totals?.settlement)}</td>
            <td>{formatMoney(totals?.qboActual)}</td>
            <td colSpan={canEditStructure ? 3 : 2} />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
