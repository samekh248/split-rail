import { describe, expect, it } from 'vitest';
import { previewNetPayout } from '@/lib/dealMathPreview';

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
});
