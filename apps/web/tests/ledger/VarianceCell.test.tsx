import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VarianceCell } from '@/components/ledger/VarianceCell';

describe('VarianceCell', () => {
  it('does not highlight zero variance', () => {
    render(
      <table>
        <tbody>
          <tr>
            <VarianceCell variance="0.00" />
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByTestId('variance-cell');
    expect(cell).toHaveAttribute('data-flagged', 'false');
    expect(cell.className).not.toContain('variance-cell--flagged');
    expect(cell).toHaveTextContent('$0.00');
  });

  it('highlights non-zero variance', () => {
    render(
      <table>
        <tbody>
          <tr>
            <VarianceCell variance="-125.50" varianceFlagged />
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByTestId('variance-cell');
    expect(cell).toHaveAttribute('data-flagged', 'true');
    expect(cell.className).toContain('variance-cell--flagged');
    expect(cell).toHaveTextContent('-$125.50');
  });

  it('auto-flags when varianceFlagged is omitted and value is non-zero', () => {
    render(
      <table>
        <tbody>
          <tr>
            <VarianceCell variance="42.00" />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('variance-cell')).toHaveAttribute('data-flagged', 'true');
  });
});
