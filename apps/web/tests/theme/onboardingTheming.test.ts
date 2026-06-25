import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

const WELCOME_BLOCK_START = '/* Welcome modal */';
const WELCOME_BLOCK_END = '.app__settings';

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function welcomeBlock(css: string): string {
  const start = css.indexOf(WELCOME_BLOCK_START);
  const end = css.indexOf(WELCOME_BLOCK_END, start);
  expect(start, 'Welcome modal comment').toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

function selectorBlock(css: string, selector: string): string {
  const escaped = selector.replace(/\./g, '\\.');
  const match = css.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\n\\}`));
  expect(match, `block for ${selector}`).toBeTruthy();
  return match![0];
}

describe('onboarding theme (SPLR-93)', () => {
  it('styles welcome backdrop with brown-tinted scrim', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.welcome-modal__backdrop');
    expect(block).toMatch(/background:\s*rgba\(62,\s*39,\s*35,\s*0\.5\)/);
  });

  it('styles welcome dialog with white surface, border, and modal shadow', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.welcome-modal');
    expect(block).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(block).toMatch(/border:\s*1px solid var\(--color-border-subtle\)/);
    expect(block).toMatch(/box-shadow:\s*var\(--shadow-modal\)/);
    expect(block.toLowerCase()).not.toMatch(/background:\s*#fff\b/);
  });

  it('styles welcome title with brand font and brown text', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.welcome-modal__title');
    expect(block).toMatch(/font-family:\s*var\(--font-brand\)/);
    expect(block).toMatch(/color:\s*var\(--color-primary-brown\)/);
  });

  it('styles welcome body with muted text token', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.welcome-modal__body');
    expect(block).toMatch(/color:\s*var\(--color-text-muted\)/);
  });

  it('styles auth resolving state with cream background and muted text', () => {
    const css = readIndexCss();
    const block = selectorBlock(css, '.auth-resolving');
    expect(block).toMatch(/background:\s*var\(--color-bg-cream\)/);
    expect(block).toMatch(/color:\s*var\(--color-text-muted\)/);
  });

  it('does not use legacy blue hex in welcome modal CSS block', () => {
    const css = welcomeBlock(readIndexCss()).toLowerCase();
    expect(css).not.toContain('#2563eb');
    expect(css).not.toContain('#3b82f6');
    expect(css).not.toContain('#64748b');
    expect(css).not.toContain('#f8fafc');
  });
});
