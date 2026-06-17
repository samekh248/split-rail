import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LedgerRow } from '@/components/ledger/LedgerRow';
import type { EditabilityDto, LineItemDto } from '@/types/generated-api';

const baseRow: LineItemDto = {
  id: 'row-1',
  rowLabel: 'GA Tickets',
  sortOrder: 0,
  isArtistDeduction: false,
  proformaValue: '10000.00',
  settlementValue: '0.00',
  qboActualValue: '0.00',
  variance: '0.00',
  varianceFlagged: false,
  notes: null,
  isHiddenFromPromoter: false,
  rowVersion: 'v1',
};

const secondRow: LineItemDto = {
  ...baseRow,
  id: 'row-2',
  rowLabel: 'VIP',
  sortOrder: 1,
};

const editability: EditabilityDto = {
  proforma: 'editable',
  settlement: 'locked',
  qboActuals: 'locked',
};

function renderRow(
  props: Partial<ComponentProps<typeof LedgerRow>> = {},
) {
  return render(
    <table>
      <tbody>
        <LedgerRow
          row={baseRow}
          editability={editability}
          blockType="REVENUE"
          canEditStructure
          blockRows={[baseRow, secondRow]}
          {...props}
        />
      </tbody>
    </table>,
  );
}

describe('LineItemCrud', () => {
  it('calls delete handler after confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDeleteLineItem = vi.fn();

    renderRow({ onDeleteLineItem });

    await user.click(screen.getByTestId('delete-row-row-1'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDeleteLineItem).toHaveBeenCalledWith('row-1', 'GA Tickets');

    confirmSpy.mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDeleteLineItem = vi.fn();

    renderRow({ onDeleteLineItem });

    await user.click(screen.getByTestId('delete-row-row-1'));

    expect(onDeleteLineItem).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('disables move-up on the first row', () => {
    renderRow();

    expect(screen.getByTestId('move-up-row-1')).toBeDisabled();
    expect(screen.getByTestId('move-down-row-1')).not.toBeDisabled();
  });

  it('disables move-down on the last row', () => {
    render(
      <table>
        <tbody>
          <LedgerRow
            row={secondRow}
            editability={editability}
            blockType="REVENUE"
            canEditStructure
            blockRows={[baseRow, secondRow]}
            onMoveLineItem={vi.fn()}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('move-up-row-2')).not.toBeDisabled();
    expect(screen.getByTestId('move-down-row-2')).toBeDisabled();
  });

  it('invokes move handler when move-down is clicked', async () => {
    const user = userEvent.setup();
    const onMoveLineItem = vi.fn();

    renderRow({ onMoveLineItem });

    await user.click(screen.getByTestId('move-down-row-1'));

    expect(onMoveLineItem).toHaveBeenCalledWith('row-1', 'down');
  });
});
