import { describe, expect, it } from 'vitest';
import {
  absMoney,
  addMoney,
  compareMoney,
  formatMoney,
  isNonZeroVariance,
  isZeroMoney,
  normalizeMoney,
  parseMoneyInput,
  subtractMoney,
} from '@/lib/money';

describe('money', () => {
  it('normalizes to two decimal places', () => {
    expect(normalizeMoney('1234.5')).toBe('1234.50');
    expect(normalizeMoney('0')).toBe('0.00');
  });

  it('formats with currency symbol and commas', () => {
    expect(formatMoney('10000.00')).toBe('$10,000.00');
    expect(formatMoney('-125.50')).toBe('-$125.50');
  });

  it('parses user input stripping symbols', () => {
    expect(parseMoneyInput('$1,234.56')).toBe('1234.56');
    expect(parseMoneyInput('invalid')).toBeNull();
  });

  it('adds and subtracts without float drift', () => {
    expect(addMoney('0.10', '0.20')).toBe('0.30');
    expect(subtractMoney('1000.00', '999.99')).toBe('0.01');
  });

  it('detects non-zero variance', () => {
    expect(isNonZeroVariance('0.00')).toBe(false);
    expect(isNonZeroVariance('0.01')).toBe(true);
    expect(isNonZeroVariance('-0.01')).toBe(true);
  });

  it('compares and normalizes signed values', () => {
    expect(compareMoney('10.00', '5.00')).toBe(1);
    expect(compareMoney('5.00', '10.00')).toBe(-1);
    expect(compareMoney('5.00', '5.00')).toBe(0);
    expect(isZeroMoney('0.00')).toBe(true);
    expect(isZeroMoney('bad')).toBe(false);
    expect(absMoney('-12.34')).toBe('12.34');
  });
});
