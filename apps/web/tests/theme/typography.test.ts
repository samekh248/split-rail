import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

describe('typography', () => {
  it('references --font-heading for headings and --font-ui for body', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain('--font-heading');
    expect(css).toContain('--font-ui');
    expect(css).toMatch(/h1[\s\S]*font-family:\s*var\(--font-heading\)/);
    expect(css).toMatch(/body[\s\S]*font-family:\s*var\(--font-ui\)/);
  });

  it('loads Zilla Slab and Inter via Google Fonts import', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain('fonts.googleapis.com');
    expect(css).toContain('Zilla+Slab');
    expect(css).toContain('Inter');
  });
});
