import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_HEX_DENYLIST } from '@/theme/legacyPalette';

const indexCssPath = resolve(__dirname, '../../src/index.css');

describe('legacyPalette scan', () => {
  it('contains no denylisted legacy hex values in index.css', () => {
    const css = readFileSync(indexCssPath, 'utf-8').toLowerCase();
    for (const hex of LEGACY_HEX_DENYLIST) {
      expect(css, `found legacy hex ${hex}`).not.toContain(hex.toLowerCase());
    }
  });
});
