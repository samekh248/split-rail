import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

const AUTH_BLOCK_START = '/* Auth layout */';
const AUTH_BLOCK_END = '.event-form-panel,';

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function authBlock(css: string): string {
  const start = css.indexOf(AUTH_BLOCK_START);
  const end = css.indexOf(AUTH_BLOCK_END, start);
  expect(start, 'Auth layout comment').toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

function selectorBlock(css: string, selector: string): string {
  const escaped = selector.replace(/\./g, '\\.');
  const match = css.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\n\\}`));
  expect(match, `block for ${selector}`).toBeTruthy();
  return match![0];
}

describe('auth layout theme (SPLR-92)', () => {
  it('styles page shell with cream background', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.auth-layout');
    expect(block).toMatch(/background:\s*var\(--color-bg-cream\)/);
  });

  it('styles auth card with white surface, border, and shadow', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.auth-layout__card');
    expect(block).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(block).toMatch(/border:\s*1px solid var\(--color-border-subtle\)/);
    expect(block).toMatch(/box-shadow:\s*var\(--shadow-card\)/);
  });

  it('styles title with brand font and brown text', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.auth-layout__title');
    expect(block).toMatch(/font-family:\s*var\(--font-brand\)/);
    expect(block).toMatch(/color:\s*var\(--color-primary-brown\)/);
  });

  it('styles inline links with orange accent and focus ring', () => {
    const css = readIndexCss();
    const linkBlock = selectorBlock(css, '.auth-layout__link');
    expect(linkBlock).toMatch(/color:\s*var\(--color-accent-orange\)/);
    expect(linkBlock.toLowerCase()).not.toContain('#2563eb');

    const focusBlock = selectorBlock(css, '.auth-layout__link:focus-visible');
    expect(focusBlock).toMatch(/outline:\s*2px solid var\(--color-focus-ring\)/);
  });

  it('styles form inputs with token borders and focus states', () => {
    const css = readIndexCss();
    const inputBlock = selectorBlock(css, '.form-field__input');
    expect(inputBlock).toMatch(/color:\s*var\(--color-primary-brown\)/);
    expect(inputBlock).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(inputBlock).toMatch(/border:\s*1px solid var\(--color-border-subtle\)/);

    const focusBlock = selectorBlock(css, '.form-field__input:focus-visible');
    expect(focusBlock).toMatch(/outline:\s*2px solid var\(--color-focus-ring\)/);
    expect(focusBlock).toMatch(/border-color:\s*var\(--color-accent-orange\)/);
  });

  it('styles auth resolving state with cream background', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.auth-resolving');
    expect(block).toMatch(/background:\s*var\(--color-bg-cream\)/);
  });

  it('does not use legacy blue hex in auth CSS block', () => {
    const css = authBlock(readIndexCss()).toLowerCase();
    expect(css).not.toContain('#2563eb');
    expect(css).not.toContain('#3b82f6');
    expect(css).not.toContain('#64748b');
    expect(css).not.toContain('#f8fafc');
  });

  it('styles session notice with warning tokens', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.session-expired-notice');
    expect(block).toMatch(/background:\s*var\(--color-warning-bg\)/);
    expect(block).toMatch(/border:\s*1px solid var\(--color-warning-border\)/);
    expect(block).toMatch(/color:\s*var\(--color-warning-text\)/);
  });
});
