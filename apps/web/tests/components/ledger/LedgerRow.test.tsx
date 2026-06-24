import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LedgerRow } from '@/components/ledger/LedgerRow';
import type { EditabilityDto, LineItemDto } from '@/types/generated-api';

const editability: EditabilityDto = {
  proforma: 'read-only',
  settlement: 'read-only',
  qboActuals: 'read-only',
};

const baseRow: LineItemDto = {
  id: 'row-1',
  rowLabel: 'Production',
  sortOrder: 0,
  isArtistDeduction: false,
  proformaValue: '1000.00',
  settlementValue: '900.00',
  qboActualValue: '950.00',
  variance: '50.00',
  varianceFlagged: true,
  notes: null,
  isHiddenFromPromoter: false,
  rowVersion: 'v1',
  hasQboCorrection: false,
};

describe('LedgerRow correction badge', () => {
  it('shows correction badge when hasQboCorrection is true', () => {
    render(
      <table>
        <tbody>
          <LedgerRow
            row={{ ...baseRow, hasQboCorrection: true }}
            editability={editability}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('qbo-correction-badge-row-1')).toBeInTheDocument();
  });

  it('hides correction badge when hasQboCorrection is false', () => {
    render(
      <table>
        <tbody>
          <LedgerRow row={baseRow} editability={editability} />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('qbo-correction-badge-row-1')).not.toBeInTheDocument();
  });
});
