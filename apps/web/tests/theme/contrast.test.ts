import { describe, expect, it } from 'vitest';
import {
  compositeRgbaOnHex,
  contrastRatio,
  meetsWcagAaLargeText,
  meetsWcagAaNormalText,
  meetsWcagAaUiComponent,
  pairingContrastRatio,
  resolvePairingForeground,
} from '@/theme/contrast';
import { colors, contrastPairings } from '@/theme/tokens';

describe('contrast helper', () => {
  it('exports canonical token colors', () => {
    expect(colors.primaryBrown).toBe('#3E2723');
    expect(colors.accentOrange).toBe('#E65100');
    expect(colors.bgCream).toBe('#F4F1EA');
    expect(colors.surfaceWhite).toBe('#FFFFFF');
    expect(colors.textOnAccent).toBe('#FFFFFF');
    expect(colors.accentOrangeDisabled).toBe('#D97B4A');
  });

  it('computes contrast ratio between foreground and background', () => {
    const ratio = contrastRatio(colors.primaryBrown, colors.bgCream);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(21);
  });

  it('composites rgba foreground onto opaque backgrounds', () => {
    const composited = compositeRgbaOnHex(colors.textMutedRgba, colors.bgCream);
    expect(composited).toMatch(/^#[0-9A-F]{6}$/);
    expect(contrastRatio(composited, colors.bgCream)).toBeGreaterThanOrEqual(4.5);
  });

  it('exposes WCAG AA threshold helpers', () => {
    expect(meetsWcagAaNormalText(colors.primaryBrown, colors.bgCream)).toBe(true);
    expect(meetsWcagAaLargeText(colors.textOnAccent, colors.accentOrange)).toBe(true);
    expect(meetsWcagAaUiComponent(colors.accentOrange, colors.surfaceWhite)).toBe(true);
  });

  it('resolves rgba pairings before measuring contrast', () => {
    const mutedPairing = contrastPairings.find((pairing) => pairing.id === 'muted-on-cream');
    expect(mutedPairing).toBeDefined();
    const foreground = resolvePairingForeground(mutedPairing!);
    expect(foreground).not.toBe(colors.primaryBrown);
    expect(pairingContrastRatio(mutedPairing!)).toBeGreaterThanOrEqual(4.5);
  });

  it('validates all WCAG AA pairings from tokens', () => {
    for (const pairing of contrastPairings) {
      const ratio = pairingContrastRatio(pairing);
      expect(ratio).toBeGreaterThanOrEqual(pairing.minRatio);
      if (pairing.minRatio >= 4.5) {
        expect(meetsWcagAaNormalText(resolvePairingForeground(pairing), pairing.background)).toBe(
          true,
        );
      }
    }
  });
});
