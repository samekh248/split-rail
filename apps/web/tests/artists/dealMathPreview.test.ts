import { describe, expect, it } from 'vitest';
import { previewNetPayout, type PreviewNetPayoutInput } from '@/lib/dealMathPreview';

describe('dealMathPreview', () => {
  it('calculates guarantee payout with tax withholding', () => {
    const result = previewNetPayout({
      dealType: 'guarantee',
      baseGuarantee: '5000.00',
      backendPercentage: '70.00',
      taxWithholdingPercentage: '10.00',
      grossRevenue: '10000.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '6300.00' });
  });

  it('calculates door split from net show revenue after deductions', () => {
    const result = previewNetPayout({
      dealType: 'door_split',
      baseGuarantee: '0.00',
      backendPercentage: '50.00',
      taxWithholdingPercentage: '0.00',
      grossRevenue: '10000.00',
      totalDeductions: '2000.00',
    });

    expect(result).toEqual({ payout: '4000.00' });
  });

  it('evaluates nested custom formula tokens', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '50.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: '((GrossRevenue - TotalDeductions) * SplitPercentage)',
      grossRevenue: '10000.00',
      totalDeductions: '2000.00',
    });

    expect(result).toEqual({ payout: '4000.00' });
  });

  it('strips injection characters from custom formulas', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: 'GrossRevenue + 0@#$%',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '100.00' });
  });

  it('rounds custom formula division away from zero', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: 'GrossRevenue / 3',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '33.33' });
  });

  it('matches spec custom deal formula example', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '1000.00',
      backendPercentage: '50.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression:
        '(GrossRevenue - TotalDeductions) * SplitPercentage - BaseGuarantee',
      grossRevenue: '10000.00',
      totalDeductions: '2000.00',
    });

    expect(result).toEqual({ payout: '3000.00' });
  });

  it('returns error for invalid custom syntax', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: 'GrossRevenue + +',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toHaveProperty('error');
  });

  it('rounds fractional door split to 333.30 (contract V1)', () => {
    const result = previewNetPayout({
      dealType: 'door_split',
      baseGuarantee: '0.00',
      backendPercentage: '33.33',
      taxWithholdingPercentage: '0.00',
      grossRevenue: '1000.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '333.30' });
  });

  it('applies tax midpoint rounding (contract V2)', () => {
    const result = previewNetPayout({
      dealType: 'door_split',
      baseGuarantee: '0.00',
      backendPercentage: '100.00',
      taxWithholdingPercentage: '10.00',
      grossRevenue: '100.05',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '90.04' });
  });

  it('applies tax to custom formula gross (contract V3)', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '10.00',
      customFormulaExpression: 'GrossRevenue',
      grossRevenue: '1000.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '900.00' });
  });

  it('produces equivalent net payout across deal types (contract V4)', () => {
    const guarantee = previewNetPayout({
      dealType: 'guarantee',
      baseGuarantee: '5000.00',
      backendPercentage: '40.00',
      taxWithholdingPercentage: '10.00',
      grossRevenue: '10000.00',
      totalDeductions: '0.00',
    });
    const doorSplit = previewNetPayout({
      dealType: 'door_split',
      baseGuarantee: '0.00',
      backendPercentage: '50.00',
      taxWithholdingPercentage: '10.00',
      grossRevenue: '10000.00',
      totalDeductions: '0.00',
    });
    const custom = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '10.00',
      customFormulaExpression: 'GrossRevenue',
      grossRevenue: '5000.00',
      totalDeductions: '0.00',
    });

    expect(guarantee).toEqual({ payout: '4500.00' });
    expect(doorSplit).toEqual({ payout: '4500.00' });
    expect(custom).toEqual({ payout: '4500.00' });
  });

  it('floors zero net revenue payout at zero (contract V5)', () => {
    const result = previewNetPayout({
      dealType: 'door_split',
      baseGuarantee: '0.00',
      backendPercentage: '50.00',
      taxWithholdingPercentage: '10.00',
      grossRevenue: '100.00',
      totalDeductions: '100.00',
    });

    expect(result).toEqual({ payout: '0.00' });
  });

  it('floors negative custom formula at zero (contract V6)', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '10.00',
      customFormulaExpression: '0 - GrossRevenue',
      grossRevenue: '1000.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '0.00' });
  });

  it('rounds guarantee split before compare', () => {
    const result = previewNetPayout({
      dealType: 'guarantee',
      baseGuarantee: '333.00',
      backendPercentage: '33.33',
      taxWithholdingPercentage: '0.00',
      grossRevenue: '1000.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ payout: '333.30' });
  });

  it('returns error for unsupported deal type', () => {
    const result = previewNetPayout({
      dealType: 'invalid_type' as PreviewNetPayoutInput['dealType'],
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ error: 'Unsupported deal type' });
  });

  it('returns error when custom formula is empty', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: '   ',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ error: 'Custom formula expression is required.' });
  });

  it('returns error when custom formula sanitizes to empty', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: '@@@',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ error: 'Custom formula expression is invalid after sanitization.' });
  });

  it('returns error for divide by zero in custom formula', () => {
    const result = previewNetPayout({
      dealType: 'custom',
      baseGuarantee: '0.00',
      backendPercentage: '0.00',
      taxWithholdingPercentage: '0.00',
      customFormulaExpression: 'GrossRevenue / 0',
      grossRevenue: '100.00',
      totalDeductions: '0.00',
    });

    expect(result).toEqual({ error: 'Division by zero' });
  });
});
