import { compareMoney, isNonZeroVariance, normalizeMoney, subtractMoney } from './money';

function normalizeOrZero(value: string | null | undefined): string {
  if (value == null || value.trim() === '') {
    return '0.00';
  }
  return normalizeMoney(value);
}

/** Client-side per-row variance: QBO actual minus settlement (FR-016). */
export function deriveVariance(
  qboActual: string | null | undefined,
  settlement: string | null | undefined,
): string {
  return subtractMoney(normalizeOrZero(qboActual), normalizeOrZero(settlement));
}

export interface ResolveVarianceInput {
  qboActual: string | null | undefined;
  settlement: string | null | undefined;
  serverVariance: string | null | undefined;
}

export interface ResolvedVariance {
  displayVariance: string;
  flagged: boolean;
  clientDerived: string;
  agreesWithServer: boolean;
}

/** Derive variance client-side; display server value when they disagree (FR-003). */
export function resolveVarianceDisplay(input: ResolveVarianceInput): ResolvedVariance {
  const clientDerived = deriveVariance(input.qboActual, input.settlement);
  const serverNorm = normalizeOrZero(input.serverVariance);
  const agreesWithServer = compareMoney(clientDerived, serverNorm) === 0;
  const displayVariance = agreesWithServer ? clientDerived : serverNorm;

  return {
    displayVariance,
    flagged: isNonZeroVariance(displayVariance),
    clientDerived,
    agreesWithServer,
  };
}
