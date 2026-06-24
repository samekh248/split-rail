import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

describe('button theme classes', () => {
  it('defines .btn-primary with accent orange background token', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/\.btn-primary[\s\S]*background:\s*var\(--color-accent-orange\)/);
    expect(css).toMatch(/\.btn-primary[\s\S]*color:\s*var\(--color-surface-white\)/);
  });

  it('defines .btn-secondary with transparent background', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/\.btn-secondary[\s\S]*background:\s*transparent/);
  });
});
