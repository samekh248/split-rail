import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LedgerGrid } from '@/components/ledger/LedgerGrid';
import { LedgerRow } from '@/components/ledger/LedgerRow';
import type { EditabilityDto, LineItemDto } from '@/types/generated-api';

const baseRow: LineItemDto = {
  id: 'row-1',
  rowLabel: 'GA Tickets',
  sortOrder: 0,
  isArtistDeduction: false,
  proformaValue: '10000.00',
  settlementValue: '8500.00',
  qboActualValue: '0.00',
  variance: '0.00',
  varianceFlagged: false,
  notes: null,
  isHiddenFromPromoter: false,
  rowVersion: 'v1',
};

describe('Editability', () => {
  it('locks proforma after budget lock (read-only display)', () => {
    const editability: EditabilityDto = {
      proforma: 'read-only',
      settlement: 'editable',
      qboActuals: 'locked',
    };

    render(
      <table>
        <tbody>
          <LedgerRow row={baseRow} editability={editability} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('proforma-readonly-row-1')).toBeInTheDocument();
    expect(screen.queryByTestId('proforma-row-1')).not.toBeInTheDocument();
  });

  it('enables settlement cells when settlement is editable', () => {
    const editability: EditabilityDto = {
      proforma: 'read-only',
      settlement: 'editable',
      qboActuals: 'locked',
    };

    render(
      <table>
        <tbody>
          <LedgerRow row={baseRow} editability={editability} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('settlement-row-1')).toBeInTheDocument();
  });

  it('shows lock budget button only when budget is unlocked', () => {
    const lockedLedger = {
      eventId: 'evt-1',
      venueId: 'ven-1',
      title: 'Show',
      eventDate: '2026-07-04',
      status: 'PRE_SHOW' as const,
      isBudgetLocked: true,
      qboTagName: 'EVENT',
      editability: {
        proforma: 'read-only' as const,
        settlement: 'editable' as const,
        qboActuals: 'locked' as const,
      },
      blocks: [
        {
          blockType: 'REVENUE' as const,
          rows: [baseRow],
          blockTotals: { proforma: '10000.00' },
        },
        { blockType: 'EXPENSES' as const, rows: [], blockTotals: {} },
        { blockType: 'DEAL_MATH' as const, rows: [], blockTotals: {} },
      ],
      artists: [],
      summary: {
        grossRevenue: '10000.00',
        totalDeductions: '0.00',
        netShowRevenue: '10000.00',
      },
    };

    render(<LedgerGrid ledger={lockedLedger} />);
    expect(screen.queryByTestId('lock-budget-btn')).not.toBeInTheDocument();
  });

  it('saves inline label edits on blur when structural editing is allowed', async () => {
    const user = userEvent.setup();
    const onLabelChange = vi.fn();

    render(
      <table>
        <tbody>
          <LedgerRow
            row={baseRow}
            editability={{
              proforma: 'editable',
              settlement: 'locked',
              qboActuals: 'locked',
            }}
            canEditStructure
            onLabelChange={onLabelChange}
          />
        </tbody>
      </table>,
    );

    const input = screen.getByTestId('label-edit-row-1');
    await user.clear(input);
    await user.type(input, 'Renamed row');
    await user.tab();

    expect(onLabelChange).toHaveBeenCalledWith('row-1', 'Renamed row');
  });

  it('toggles artist deduction flag on expense rows', async () => {
    const user = userEvent.setup();
    const onDeductionChange = vi.fn();

    render(
      <table>
        <tbody>
          <LedgerRow
            row={{ ...baseRow, isArtistDeduction: false }}
            blockType="EXPENSES"
            editability={{
              proforma: 'editable',
              settlement: 'locked',
              qboActuals: 'locked',
            }}
            canEditStructure
            onDeductionChange={onDeductionChange}
          />
        </tbody>
      </table>,
    );

    await user.click(screen.getByTestId('deduction-row-1'));

    expect(onDeductionChange).toHaveBeenCalledWith('row-1', true);
  });
});
