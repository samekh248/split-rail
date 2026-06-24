import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../../src/index.css');

describe('LedgerGrid theme surfaces', () => {
  it('styles ledger containers with white surfaces on cream canvas', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/\.block-section[\s\S]*background:\s*var\(--color-surface-white\)/);
    expect(css).toMatch(/\.ledger-grid__summary[\s\S]*background:\s*var\(--color-surface-white\)/);
    expect(css).toMatch(/\.event-ledger-page[\s\S]*background:\s*var\(--color-bg-cream\)/);
  });
});
