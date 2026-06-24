import { resolveVarianceDisplay } from '@/lib/ledgerVariance';
import { compareMoney } from '@/lib/money';
import type { LineItemDto } from '@/types/generated-api';

/** True when any row has negative variance per ledger grid derivation rules. */
export function eventHasNegativeVariance(rows: LineItemDto[]): boolean {
  for (const row of rows) {
    const resolved = resolveVarianceDisplay({
      qboActual: row.qboActualValue,
      settlement: row.settlementValue,
      serverVariance: row.variance,
    });
    if (compareMoney(resolved.displayVariance, '0.00') < 0) {
      return true;
    }
  }
  return false;
}
