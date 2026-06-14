import { formatMoney, isNonZeroVariance } from '@/lib/money';

interface VarianceCellProps {
  variance: string;
  varianceFlagged?: boolean;
}

export function VarianceCell({ variance, varianceFlagged }: VarianceCellProps) {
  const flagged = varianceFlagged ?? isNonZeroVariance(variance);

  return (
    <td
      className={`variance-cell${flagged ? ' variance-cell--flagged' : ''}`}
      data-testid="variance-cell"
      data-flagged={flagged ? 'true' : 'false'}
    >
      {formatMoney(variance)}
    </td>
  );
}
