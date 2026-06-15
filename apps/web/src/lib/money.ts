/**
 * Decimal-string money helpers — no floating-point arithmetic.
 * Values are stored as "1234.56" strings; internal math uses integer cents.
 */

const CENTS_SCALE = 2;

function parseToCents(value: string): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) {
    throw new Error(`Invalid money string: ${value}`);
  }

  const negative = trimmed.startsWith('-');
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fracPart = ''] = normalized.split('.');
  const fracPadded = (fracPart + '00').slice(0, CENTS_SCALE);
  const cents = BigInt(wholePart) * 100n + BigInt(fracPadded);
  return negative ? -cents : cents;
}

function centsToString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** Normalize input to two-decimal string (e.g. "1234.5" → "1234.50"). */
export function normalizeMoney(value: string): string {
  return centsToString(parseToCents(value));
}

/** Format for display with thousands separators and optional currency symbol. */
export function formatMoney(
  value: string | null | undefined,
  currencySymbol = '$',
): string {
  const normalized = normalizeMoney(value ?? '0.00');
  const negative = normalized.startsWith('-');
  const [whole, frac] = (negative ? normalized.slice(1) : normalized).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${currencySymbol}${withCommas}.${frac}`;
  return negative ? `-${formatted}` : formatted;
}

/** Parse user input; returns normalized string or null if invalid. */
export function parseMoneyInput(input: string): string | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  try {
    return normalizeMoney(cleaned);
  } catch {
    return null;
  }
}

export function isZeroMoney(value: string): boolean {
  try {
    return parseToCents(value) === 0n;
  } catch {
    return false;
  }
}

export function compareMoney(a: string, b: string): -1 | 0 | 1 {
  const aCents = parseToCents(a);
  const bCents = parseToCents(b);
  if (aCents < bCents) return -1;
  if (aCents > bCents) return 1;
  return 0;
}

export function addMoney(a: string, b: string): string {
  return centsToString(parseToCents(a) + parseToCents(b));
}

export function subtractMoney(a: string, b: string): string {
  return centsToString(parseToCents(a) - parseToCents(b));
}

export function absMoney(value: string): string {
  const cents = parseToCents(value);
  return centsToString(cents < 0n ? -cents : cents);
}

/** Returns true when |variance| > 0.00 */
export function isNonZeroVariance(variance: string): boolean {
  return !isZeroMoney(variance);
}
