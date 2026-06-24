import { describe, expect, it } from 'vitest';
import { eventHasNegativeVariance } from '@/lib/eventCardVariance';
import type { LineItemDto } from '@/types/generated-api';

describe('eventHasNegativeVariance', () => {
  it('returns true when any row has negative variance', () => {
    const rows: LineItemDto[] = [
      { qboActualValue: '100.00', settlementValue: '100.00', variance: '0.00' },
      { qboActualValue: '50.00', settlementValue: '75.00', variance: '-25.00' },
    ];
    expect(eventHasNegativeVariance(rows)).toBe(true);
  });

  it('returns false when all variances are zero or positive', () => {
    const rows: LineItemDto[] = [
      { qboActualValue: '100.00', settlementValue: '100.00', variance: '0.00' },
      { qboActualValue: '80.00', settlementValue: '75.00', variance: '5.00' },
    ];
    expect(eventHasNegativeVariance(rows)).toBe(false);
  });

  it('returns false for empty rows', () => {
    expect(eventHasNegativeVariance([])).toBe(false);
  });
});
