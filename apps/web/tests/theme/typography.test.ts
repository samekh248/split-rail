import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fonts } from '../../src/theme/tokens';

const indexCssPath = resolve(__dirname, '../../src/index.css');
const indexHtmlPath = resolve(__dirname, '../../index.html');

describe('typography', () => {
  it('references --font-brand for headings and --font-ui for body', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain('--font-brand');
    expect(css).not.toContain('--font-heading');
    expect(css).toContain('--font-ui');
    expect(css).toMatch(/h1[\s\S]*font-family:\s*var\(--font-brand\)/);
    expect(css).toMatch(/body[\s\S]*font-family:\s*var\(--font-ui\)/);
  });

  it('declares brand-guide font token stacks on :root', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain(`--font-brand: ${fonts.brand}`);
    expect(css).toContain(`--font-ui: ${fonts.ui}`);
  });

  it('loads Zilla Slab and Inter via Google Fonts import with required weights', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toContain('fonts.googleapis.com');
    expect(css).toContain('Zilla+Slab:wght@700');
    expect(css).toContain('Inter:wght@400;500;700');
    expect(css).toContain('display=swap');
  });

  it('does not load Google Fonts via duplicate stylesheet link in index.html', () => {
    const html = readFileSync(indexHtmlPath, 'utf-8');
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+fonts\.googleapis\.com/i);
    expect(html).not.toMatch(/fonts\.googleapis\.com[^>]+rel=["']stylesheet["']/i);
    expect(html).toContain('rel="preconnect"');
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('fonts.gstatic.com');
  });
});
