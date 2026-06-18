import type { DealType } from '@/types/generated-api';
import {
  maxMoney,
  multiplyMoneyPercent,
  normalizeMoney,
  roundMoneyAwayFromZero,
  subtractMoney,
} from '@/lib/money';

const FORMULA_SANITIZER = /[^a-zA-Z0-9\s+\-*/().]/g;
const FORMULA_SCALE = 10000n;

export interface PreviewNetPayoutInput {
  dealType: DealType;
  baseGuarantee: string;
  backendPercentage: string;
  taxWithholdingPercentage: string;
  customFormulaExpression?: string | null;
  grossRevenue: string;
  totalDeductions: string;
}

export type PreviewNetPayoutResult =
  | { payout: string }
  | { error: string };

function moneyToFormulaScale(value: string): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) {
    throw new Error(`Invalid money string: ${value}`);
  }

  const negative = trimmed.startsWith('-');
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fracPart = ''] = normalized.split('.');
  const fracPadded = (fracPart + '00').slice(0, 2);
  const cents = BigInt(wholePart) * 100n + BigInt(fracPadded);
  const scaled = cents * 100n;
  return negative ? -scaled : scaled;
}

function splitPercentageToScale(percent: string): bigint {
  const trimmed = percent.trim();
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) {
    throw new Error(`Invalid percent string: ${percent}`);
  }

  const negative = trimmed.startsWith('-');
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fracPart = ''] = normalized.split('.');
  const fracPadded = (fracPart + '00').slice(0, 2);
  const hundredths = BigInt(wholePart) * 100n + BigInt(fracPadded);
  const scaled = (hundredths * FORMULA_SCALE) / 10000n;
  return negative ? -scaled : scaled;
}

function divideAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error('Division by zero');
  }

  const negative = (numerator < 0n) !== (denominator < 0n);
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  let quotient = absNum / absDen;
  const remainder = absNum % absDen;
  if (remainder * 2n >= absDen) {
    quotient += 1n;
  }

  return negative ? -quotient : quotient;
}

function scaleToMoney(scaled: bigint): string {
  const negative = scaled < 0n;
  const absCents = divideAwayFromZero((negative ? -scaled : scaled) * 100n, FORMULA_SCALE);
  const cents = negative ? -absCents : absCents;
  const abs = cents < 0n ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${cents < 0n ? '-' : ''}${whole}.${frac}`;
}

function substituteFormulaTokens(
  expression: string,
  grossRevenue: string,
  totalDeductions: string,
  baseGuarantee: string,
  backendPercentage: string,
): string {
  const replacements: Record<string, bigint> = {
    GrossRevenue: moneyToFormulaScale(grossRevenue),
    TotalDeductions: moneyToFormulaScale(totalDeductions),
    BaseGuarantee: moneyToFormulaScale(baseGuarantee),
    SplitPercentage: splitPercentageToScale(backendPercentage),
  };

  return expression.replace(
    /\b(GrossRevenue|TotalDeductions|BaseGuarantee|SplitPercentage)\b/g,
    (token) => replacements[token].toString(),
  );
}

type Token =
  | { type: 'number'; value: bigint }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if ('+-*/()'.includes(char)) {
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
      } else {
        tokens.push({ type: 'op', value: char as '+' | '-' | '*' | '/' });
      }
      index += 1;
      continue;
    }

    if (/[\d]/.test(char)) {
      let end = index;
      while (end < expression.length && /[\d]/.test(expression[end])) {
        end += 1;
      }
      tokens.push({ type: 'number', value: BigInt(expression.slice(index, end)) });
      index = end;
      continue;
    }

    throw new Error('Invalid formula syntax');
  }

  return tokens;
}

function parseExpression(tokens: Token[], cursor: { index: number }): bigint {
  let value = parseTerm(tokens, cursor);

  while (cursor.index < tokens.length) {
    const token = tokens[cursor.index];
    if (token.type !== 'op' || (token.value !== '+' && token.value !== '-')) {
      break;
    }

    cursor.index += 1;
    const rhs = parseTerm(tokens, cursor);
    value = token.value === '+' ? value + rhs : value - rhs;
  }

  return value;
}

function parseTerm(tokens: Token[], cursor: { index: number }): bigint {
  let value = parseFactor(tokens, cursor);

  while (cursor.index < tokens.length) {
    const token = tokens[cursor.index];
    if (token.type !== 'op' || (token.value !== '*' && token.value !== '/')) {
      break;
    }

    cursor.index += 1;
    const rhs = parseFactor(tokens, cursor);
    if (token.value === '*') {
      value = divideAwayFromZero(value * rhs, FORMULA_SCALE);
    } else {
      value = divideAwayFromZero(value, rhs);
    }
  }

  return value;
}

function parseFactor(tokens: Token[], cursor: { index: number }): bigint {
  const token = tokens[cursor.index];
  if (!token) {
    throw new Error('Unexpected end of formula');
  }

  if (token.type === 'op' && token.value === '-') {
    cursor.index += 1;
    return -parseFactor(tokens, cursor);
  }

  if (token.type === 'op' && token.value === '+') {
    cursor.index += 1;
    return parseFactor(tokens, cursor);
  }

  if (token.type === 'paren' && token.value === '(') {
    cursor.index += 1;
    const value = parseExpression(tokens, cursor);
    const closing = tokens[cursor.index];
    if (!closing || closing.type !== 'paren' || closing.value !== ')') {
      throw new Error('Missing closing parenthesis');
    }
    cursor.index += 1;
    return value;
  }

  if (token.type === 'number') {
    cursor.index += 1;
    return token.value;
  }

  throw new Error('Invalid formula syntax');
}

function evaluateCustomFormula(
  expression: string | null | undefined,
  grossRevenue: string,
  totalDeductions: string,
  baseGuarantee: string,
  backendPercentage: string,
): string {
  if (!expression?.trim()) {
    throw new Error('Custom formula expression is required.');
  }

  const sanitized = expression.replace(FORMULA_SANITIZER, '');
  if (!sanitized.trim()) {
    throw new Error('Custom formula expression is invalid after sanitization.');
  }

  const substituted = substituteFormulaTokens(
    sanitized,
    grossRevenue,
    totalDeductions,
    baseGuarantee,
    backendPercentage,
  );
  const tokens = tokenize(substituted);
  const cursor = { index: 0 };
  const result = parseExpression(tokens, cursor);
  if (cursor.index !== tokens.length) {
    throw new Error('Invalid formula syntax');
  }

  const payout = scaleToMoney(result);
  return roundMoneyAwayFromZero(payout);
}

function applyTaxAndFloor(grossArtistPayout: string, taxWithholdingPercentage: string): string {
  const taxWithheld = roundMoneyAwayFromZero(
    multiplyMoneyPercent(grossArtistPayout, taxWithholdingPercentage),
  );
  const payout = roundMoneyAwayFromZero(subtractMoney(grossArtistPayout, taxWithheld));
  return compareNonNegative(payout);
}

function compareNonNegative(value: string): string {
  try {
    return normalizeMoney(value).startsWith('-') ? '0.00' : normalizeMoney(value);
  } catch {
    return '0.00';
  }
}

function calculateGuaranteeGross(
  netShowRevenue: string,
  baseGuarantee: string,
  backendPercentage: string,
): string {
  const splitAmount = roundMoneyAwayFromZero(
    multiplyMoneyPercent(netShowRevenue, backendPercentage),
  );
  return maxMoney(baseGuarantee, splitAmount);
}

export function previewNetPayout(input: PreviewNetPayoutInput): PreviewNetPayoutResult {
  try {
    const netShowRevenue = subtractMoney(input.grossRevenue, input.totalDeductions);
    let payout: string;

    switch (input.dealType) {
      case 'guarantee': {
        const gross = calculateGuaranteeGross(
          netShowRevenue,
          input.baseGuarantee,
          input.backendPercentage,
        );
        payout = applyTaxAndFloor(gross, input.taxWithholdingPercentage);
        break;
      }
      case 'door_split': {
        const gross = roundMoneyAwayFromZero(
          multiplyMoneyPercent(netShowRevenue, input.backendPercentage),
        );
        payout = applyTaxAndFloor(gross, input.taxWithholdingPercentage);
        break;
      }
      case 'custom': {
        const gross = evaluateCustomFormula(
          input.customFormulaExpression,
          input.grossRevenue,
          input.totalDeductions,
          input.baseGuarantee,
          input.backendPercentage,
        );
        payout = applyTaxAndFloor(gross, input.taxWithholdingPercentage);
        break;
      }
      default:
        return { error: 'Unsupported deal type' };
    }

    return { payout };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Formula could not be evaluated.';
    return { error: message };
  }
}
