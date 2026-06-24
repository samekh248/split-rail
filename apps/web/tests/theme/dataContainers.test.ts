import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

const IN_SCOPE_CONTAINER_SELECTORS = [
  '.block-section',
  '.ledger-grid__summary',
  '.artist-deal-panel',
  '.ledger-grid__artists',
  '.event-card',
] as const;

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function sharedContainerBlock(css: string): string {
  const start = css.indexOf('/* Shared data containers */');
  const end = css.indexOf('.ledger-grid__summary {');
  expect(start, 'Shared data containers comment').toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

function selectorBlock(css: string, selector: string): string {
  const escaped = selector.replace(/\./g, '\\.');
  const match = css.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\n\\}`));
  expect(match, `block for ${selector}`).toBeTruthy();
  return match![0];
}

describe('data container theme (SPLR-89)', () => {
  it('defines shared grouped container base with token surface, border, radius, and shadow', () => {
    const css = readIndexCss();
    const block = sharedContainerBlock(css);
    for (const selector of IN_SCOPE_CONTAINER_SELECTORS) {
      expect(block).toContain(selector);
    }
    expect(block).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(block).toMatch(/border:\s*1px solid var\(--color-border-subtle\)/);
    expect(block).toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(block).toMatch(/box-shadow:\s*var\(--shadow-soft\)/);
  });

  it('does not use #fff shorthand on .event-card', () => {
    const css = readIndexCss();
    const eventCardBlock = selectorBlock(css, '.event-card');
    expect(eventCardBlock.toLowerCase()).not.toMatch(/background:\s*#fff\b/);
  });

  it('styles ledger table headers with cream-derived tint', () => {
    const css = readIndexCss();
    expect(css).toMatch(/\.ledger-table th[\s\S]*background:\s*var\(--color-bg-cream\)/);
    expect(css.toLowerCase()).not.toContain('#f8fafc');
  });

  it('styles welcome modal with white surface and modal shadow', () => {
    const css = readIndexCss();
    const modalBlock = selectorBlock(css, '.welcome-modal');
    expect(modalBlock).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(modalBlock).toMatch(/box-shadow:\s*var\(--shadow-modal\)/);
    expect(modalBlock).toMatch(/border:\s*1px solid var\(--color-border-subtle\)/);
  });

  it('covers all FR-001 in-scope container selectors in the shared grouped block', () => {
    const css = readIndexCss();
    const block = sharedContainerBlock(css);
    for (const selector of IN_SCOPE_CONTAINER_SELECTORS) {
      expect(block, `${selector} in grouped block`).toContain(selector);
    }
  });

  it('styles auth layout card with token white surface for M5 reference', () => {
    const css = readIndexCss();
    const authCardBlock = selectorBlock(css, '.auth-layout__card');
    expect(authCardBlock).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(authCardBlock).toMatch(/box-shadow:\s*var\(--shadow-card\)/);
  });
});
