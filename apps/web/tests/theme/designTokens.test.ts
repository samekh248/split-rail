import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/theme/contrast';
import { contrastPairings } from '@/theme/tokens';

describe('designTokens WCAG AA', () => {
  it('meets minimum contrast for all primary brand pairings', () => {
    for (const { id, foreground, background, minRatio } of contrastPairings) {
      const ratio = contrastRatio(foreground, background);
      expect(ratio, `${id} ratio ${ratio}`).toBeGreaterThanOrEqual(minRatio);
    }
  });
});
