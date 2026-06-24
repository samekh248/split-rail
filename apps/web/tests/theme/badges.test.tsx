import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

describe('badge-action-required', () => {
  it('defines pill-shaped orange badge with white bold text', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/\.badge-action-required[\s\S]*background:\s*var\(--color-accent-orange\)/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*color:\s*var\(--color-surface-white\)/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*border-radius:\s*9999px/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*font-weight:\s*700/);
  });
});
