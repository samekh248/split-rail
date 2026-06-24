import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fonts } from '../../src/theme/tokens';

const indexCssPath = resolve(__dirname, '../../src/index.css');
const indexHtmlPath = resolve(__dirname, '../../index.html');

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

describe('typography', () => {
  it('documents governed selectors in the Typography comment block', () => {
    const css = readIndexCss();
    expect(css).toContain('Typography — global defaults');
    expect(css).toContain('h1, h2, h3, .heading-brand');
    expect(css).toContain('body, p, label, button, input, td, th');
    expect(css).toContain('.text-on-dark');
  });

  it('references --font-heading and --font-ui in :root', () => {
    const css = readIndexCss();
    expect(css).toContain('--font-heading');
    expect(css).toContain('--font-ui');
    expect(css).toContain('--font-brand');
  });

  it('applies brand heading rules to h1–h3 and .heading-brand', () => {
    const css = readIndexCss();
    expect(css).toMatch(
      /h1,\s*\n\s*h2,\s*\n\s*h3,\s*\n\s*\.heading-brand[\s\S]*font-family:\s*var\(--font-heading\)/,
    );
    expect(css).toMatch(
      /h1,\s*\n\s*h2,\s*\n\s*h3,\s*\n\s*\.heading-brand[\s\S]*font-weight:\s*700/,
    );
    expect(css).toMatch(
      /h1,\s*\n\s*h2,\s*\n\s*h3,\s*\n\s*\.heading-brand[\s\S]*color:\s*var\(--color-primary-brown\)/,
    );
  });

  it('applies UI sans-serif rules to body, p, label, button, input, td, th', () => {
    const css = readIndexCss();
    expect(css).toMatch(
      /body,\s*\n\s*p,\s*\n\s*label,\s*\n\s*button,\s*\n\s*input,\s*\n\s*td,\s*\n\s*th[\s\S]*font-family:\s*var\(--font-ui\)/,
    );
  });

  it('defines .text-on-dark with canvas cream token', () => {
    const css = readIndexCss();
    expect(css).toMatch(/\.text-on-dark\s*\{[\s\S]*color:\s*var\(--color-bg-cream\)/);
  });

  it('declares brand-guide font token stacks on :root', () => {
    const css = readIndexCss();
    expect(css).toContain(`--font-brand: ${fonts.brand}`);
    expect(css).toContain(`--font-ui: ${fonts.ui}`);
    expect(css).toContain('--font-heading: var(--font-brand)');
  });

  it('loads Zilla Slab and Inter via Google Fonts import with required weights', () => {
    const css = readIndexCss();
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
