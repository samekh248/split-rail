import { formatMoney, isNonZeroVariance } from '@/lib/money';

interface VarianceCellProps {
  variance: string | null | undefined;
  varianceFlagged?: boolean;
}

export function VarianceCell({ variance, varianceFlagged }: VarianceCellProps) {
  const normalizedVariance = variance ?? '0.00';
  const flagged = varianceFlagged ?? isNonZeroVariance(normalizedVariance);

  return (
    <td
      className={`variance-cell${flagged ? ' variance-cell--flagged' : ''}`}
      data-testid="variance-cell"
      data-flagged={flagged ? 'true' : 'false'}
    >
      {formatMoney(normalizedVariance)}
    </td>
  );
}
