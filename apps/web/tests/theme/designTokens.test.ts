import { describe, expect, it } from 'vitest';
import { pairingContrastRatio } from '@/theme/contrast';
import { contrastPairings } from '@/theme/tokens';

describe('designTokens WCAG AA', () => {
  it('meets minimum contrast for all audited brand pairings', () => {
    for (const pairing of contrastPairings) {
      const ratio = pairingContrastRatio(pairing);
      expect(ratio, `${pairing.id} ratio ${ratio}`).toBeGreaterThanOrEqual(pairing.minRatio);
    }
  });

  it('includes P1 body-text pairings on light surfaces', () => {
    const ids = contrastPairings.map((pairing) => pairing.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'brown-on-cream',
        'brown-on-white',
        'muted-on-cream',
        'muted-on-white',
        'border-subtle-on-cream',
        'border-subtle-on-white',
      ]),
    );
  });

  it('includes accent, navigation, and semantic feedback pairings', () => {
    const ids = contrastPairings.map((pairing) => pairing.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'text-on-accent-on-orange',
        'text-on-accent-disabled-on-orange-disabled',
        'cream-on-brown',
        'error-on-error-bg',
        'success-on-success-bg',
        'warning-text-on-warning-bg',
        'focus-ring-on-white',
      ]),
    );
  });
});
