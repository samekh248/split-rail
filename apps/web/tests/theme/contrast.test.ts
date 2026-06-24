import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsWcagAaNormalText } from '@/theme/contrast';
import { colors, contrastPairings } from '@/theme/tokens';

describe('contrast helper', () => {
  it('exports canonical token colors', () => {
    expect(colors.primaryBrown).toBe('#3E2723');
    expect(colors.accentOrange).toBe('#C45100');
    expect(colors.bgCream).toBe('#F4F1EA');
    expect(colors.surfaceWhite).toBe('#FFFFFF');
  });

  it('computes contrast ratio between foreground and background', () => {
    const ratio = contrastRatio(colors.primaryBrown, colors.bgCream);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(21);
  });

  it('validates all WCAG AA pairings from tokens', () => {
    for (const pairing of contrastPairings) {
      const ratio = contrastRatio(pairing.foreground, pairing.background);
      expect(ratio).toBeGreaterThanOrEqual(pairing.minRatio);
      expect(meetsWcagAaNormalText(pairing.foreground, pairing.background)).toBe(true);
    }
  });
});
