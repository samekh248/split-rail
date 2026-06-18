import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LedgerRow } from '@/components/ledger/LedgerRow';
import type { EditabilityDto, LineItemDto } from '@/types/generated-api';

const expenseRow: LineItemDto = {
  id: 'exp-1',
  rowLabel: 'Production',
  sortOrder: 0,
  isArtistDeduction: false,
  proformaValue: '2000.00',
  settlementValue: '0.00',
  qboActualValue: '0.00',
  variance: '0.00',
  varianceFlagged: false,
  notes: null,
  isHiddenFromPromoter: false,
  rowVersion: 'v1',
};

const editability: EditabilityDto = {
  proforma: 'editable',
  settlement: 'locked',
  qboActuals: 'locked',
};

function renderExpenseRow(
  overrides: Partial<LineItemDto> = {},
  options: {
    canEditStructure?: boolean;
    blockType?: string;
    onDeductionChange?: (id: string, isDeduction: boolean) => void;
  } = {},
) {
  const {
    canEditStructure = true,
    blockType = 'EXPENSES',
    onDeductionChange,
  } = options;

  return render(
    <table>
      <tbody>
        <LedgerRow
          row={{ ...expenseRow, ...overrides }}
          blockType={blockType}
          editability={editability}
          canEditStructure={canEditStructure}
          onDeductionChange={onDeductionChange}
        />
      </tbody>
    </table>,
  );
}

describe('ArtistDeductionToggle', () => {
  it('calls onDeductionChange when toggle clicked on expense row', async () => {
    const user = userEvent.setup();
    const onDeductionChange = vi.fn();

    renderExpenseRow({}, { onDeductionChange });

    await user.click(screen.getByTestId('deduction-exp-1'));

    expect(onDeductionChange).toHaveBeenCalledWith('exp-1', true);
  });

  it('does not show deduction toggle on revenue rows', () => {
    renderExpenseRow({}, { blockType: 'REVENUE' });

    expect(screen.queryByTestId('deduction-exp-1')).not.toBeInTheDocument();
  });

  it('shows deduction badge and row class when flagged', () => {
    const { container } = renderExpenseRow({ isArtistDeduction: true });

    expect(screen.getByTestId('deduction-badge-exp-1')).toHaveTextContent('Deduction');
    expect(container.querySelector('.ledger-row--deduction')).toBeInTheDocument();
  });

  it('does not show badge when unflagged', () => {
    const { container } = renderExpenseRow({ isArtistDeduction: false });

    expect(screen.queryByTestId('deduction-badge-exp-1')).not.toBeInTheDocument();
    expect(container.querySelector('.ledger-row--deduction')).not.toBeInTheDocument();
  });

  it('hides toggle when canEditStructure is false', () => {
    renderExpenseRow({ isArtistDeduction: true }, { canEditStructure: false });

    expect(screen.queryByTestId('deduction-exp-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('deduction-badge-exp-1')).toBeInTheDocument();
  });

  it('keeps checkbox unchecked until server state updates', async () => {
    const user = userEvent.setup();
    const onDeductionChange = vi.fn();

    renderExpenseRow({ isArtistDeduction: false }, { onDeductionChange });

    const checkbox = screen.getByTestId('deduction-exp-1') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);

    expect(onDeductionChange).toHaveBeenCalledWith('exp-1', true);
    expect(checkbox.checked).toBe(false);
  });
});
