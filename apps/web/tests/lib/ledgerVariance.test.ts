import { describe, expect, it } from 'vitest';
import { deriveVariance, resolveVarianceDisplay } from '@/lib/ledgerVariance';

describe('deriveVariance', () => {
  it('returns zero when QBO actual equals settlement', () => {
    expect(deriveVariance('1000.00', '1000.00')).toBe('0.00');
  });

  it('returns negative variance when settlement exceeds QBO actual', () => {
    expect(deriveVariance('0.00', '500.00')).toBe('-500.00');
  });

  it('handles null inputs as zero', () => {
    expect(deriveVariance(null, '125.50')).toBe('-125.50');
    expect(deriveVariance('200.00', null)).toBe('200.00');
    expect(deriveVariance(null, null)).toBe('0.00');
  });

  it('computes one-cent boundary correctly', () => {
    expect(deriveVariance('1000.00', '999.99')).toBe('0.01');
    expect(deriveVariance('10000.00', '9999.99')).toBe('0.01');
  });

  it('handles large monetary values', () => {
    expect(deriveVariance('1000000.00', '999999.99')).toBe('0.01');
  });
});

describe('resolveVarianceDisplay', () => {
  it('displays client-derived variance when server agrees', () => {
    const result = resolveVarianceDisplay({
      qboActual: '1000.00',
      settlement: '999.99',
      serverVariance: '0.01',
    });

    expect(result.agreesWithServer).toBe(true);
    expect(result.displayVariance).toBe('0.01');
    expect(result.clientDerived).toBe('0.01');
    expect(result.flagged).toBe(true);
  });

  it('falls back to server variance on mismatch', () => {
    const result = resolveVarianceDisplay({
      qboActual: '1000.00',
      settlement: '1000.00',
      serverVariance: '5.00',
    });

    expect(result.agreesWithServer).toBe(false);
    expect(result.displayVariance).toBe('5.00');
    expect(result.clientDerived).toBe('0.00');
    expect(result.flagged).toBe(true);
  });

  it('flags from displayed variance when mismatch shows server zero', () => {
    const result = resolveVarianceDisplay({
      qboActual: '100.00',
      settlement: '0.00',
      serverVariance: '0.00',
    });

    expect(result.agreesWithServer).toBe(false);
    expect(result.displayVariance).toBe('0.00');
    expect(result.flagged).toBe(false);
  });

  it('does not flag zero displayed variance', () => {
    const result = resolveVarianceDisplay({
      qboActual: '500.00',
      settlement: '500.00',
      serverVariance: '0.00',
    });

    expect(result.flagged).toBe(false);
  });
});
