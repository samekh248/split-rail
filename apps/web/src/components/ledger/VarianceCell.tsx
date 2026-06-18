import { formatMoney } from '@/lib/money';
import { resolveVarianceDisplay } from '@/lib/ledgerVariance';

interface VarianceCellProps {
  qboActual: string | null | undefined;
  settlement: string | null | undefined;
  serverVariance: string | null | undefined;
}

export function VarianceCell({ qboActual, settlement, serverVariance }: VarianceCellProps) {
  const { displayVariance, flagged } = resolveVarianceDisplay({
    qboActual,
    settlement,
    serverVariance,
  });

  return (
    <td
      className={`variance-cell${flagged ? ' variance-cell--flagged' : ''}`}
      data-testid="variance-cell"
      data-flagged={flagged ? 'true' : 'false'}
    >
      {formatMoney(displayVariance)}
    </td>
  );
}
