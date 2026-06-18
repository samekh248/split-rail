import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VarianceCell } from '@/components/ledger/VarianceCell';

function renderCell(
  props: {
    qboActual?: string | null;
    settlement?: string | null;
    serverVariance?: string | null;
  },
) {
  return render(
    <table>
      <tbody>
        <tr>
          <VarianceCell
            qboActual={props.qboActual}
            settlement={props.settlement}
            serverVariance={props.serverVariance}
          />
        </tr>
      </tbody>
    </table>,
  );
}

describe('VarianceCell', () => {
  it('derives and displays zero variance when QBO actual equals settlement', () => {
    renderCell({
      qboActual: '1000.00',
      settlement: '1000.00',
      serverVariance: '0.00',
    });

    const cell = screen.getByTestId('variance-cell');
    expect(cell).toHaveAttribute('data-flagged', 'false');
    expect(cell.className).not.toContain('variance-cell--flagged');
    expect(cell).toHaveTextContent('$0.00');
  });

  it('derives negative variance and highlights non-zero', () => {
    renderCell({
      qboActual: '0.00',
      settlement: '125.50',
      serverVariance: '-125.50',
    });

    const cell = screen.getByTestId('variance-cell');
    expect(cell).toHaveAttribute('data-flagged', 'true');
    expect(cell.className).toContain('variance-cell--flagged');
    expect(cell).toHaveTextContent('-$125.50');
  });

  it('derives one-cent boundary variance', () => {
    renderCell({
      qboActual: '1000.00',
      settlement: '999.99',
      serverVariance: '0.01',
    });

    expect(screen.getByTestId('variance-cell')).toHaveTextContent('$0.01');
  });

  it('shows server variance when client derivation disagrees', () => {
    renderCell({
      qboActual: '1000.00',
      settlement: '1000.00',
      serverVariance: '5.00',
    });

    const cell = screen.getByTestId('variance-cell');
    expect(cell).toHaveTextContent('$5.00');
    expect(cell).toHaveAttribute('data-flagged', 'true');
  });

  it('updates displayed variance when settlement prop changes on rerender', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <VarianceCell
              qboActual="500.00"
              settlement="400.00"
              serverVariance="100.00"
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('variance-cell')).toHaveTextContent('$100.00');

    rerender(
      <table>
        <tbody>
          <tr>
            <VarianceCell
              qboActual="500.00"
              settlement="450.00"
              serverVariance="50.00"
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByTestId('variance-cell')).toHaveTextContent('$50.00');
  });
});
