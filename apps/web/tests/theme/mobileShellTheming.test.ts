import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function extractMobileMediaBlock(css: string): string {
  const match = css.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/);
  expect(match, '@media (max-width: 768px) block').toBeTruthy();
  return match![1];
}

describe('mobileShellTheming', () => {
  it('themes mobile top bar with brown background and cream text tokens', () => {
    const mobile = extractMobileMediaBlock(readIndexCss());
    expect(mobile).toMatch(/\.top-bar\s*\{[\s\S]*background:\s*var\(--color-primary-brown\)/);
    expect(mobile).toMatch(/\.top-bar\s*\{[\s\S]*color:\s*var\(--color-text-on-dark\)/);
    expect(mobile).toMatch(
      /\.top-bar__org-name\s*\{[\s\S]*color:\s*var\(--color-text-on-dark\)/,
    );
    expect(mobile).toMatch(
      /\.top-bar__menu-button\s*\{[\s\S]*color:\s*var\(--color-text-on-dark\)/,
    );
  });

  it('defines drawer panel brown background outside mobile-only scope', () => {
    const css = readIndexCss();
    expect(css).toMatch(
      /\.mobile-nav-drawer__panel\s*\{[\s\S]*background:\s*var\(--color-primary-brown\)/,
    );
    expect(css).toMatch(
      /\.mobile-nav-drawer__panel\s*\{[\s\S]*color:\s*var\(--color-bg-cream\)/,
    );
  });

  it('keeps desktop top bar transparent in base rules', () => {
    const css = readIndexCss();
    expect(css).toMatch(/\.top-bar\s*\{[\s\S]*background:\s*transparent/);
  });

  it('defines 44px touch targets for mobile menu and drawer close controls', () => {
    const css = readIndexCss();
    const mobile = extractMobileMediaBlock(css);
    expect(mobile).toMatch(
      /\.top-bar__menu-button\s*\{[\s\S]*min-width:\s*2\.75rem/,
    );
    expect(mobile).toMatch(
      /\.top-bar__menu-button\s*\{[\s\S]*min-height:\s*2\.75rem/,
    );
    expect(css).toMatch(
      /\.mobile-nav-drawer__close\s*\{[\s\S]*min-width:\s*2\.75rem/,
    );
    expect(css).toMatch(
      /\.mobile-nav-drawer__close\s*\{[\s\S]*min-height:\s*2\.75rem/,
    );
  });

  it('defines cream focus rings on mobile shell controls', () => {
    const css = readIndexCss();
    const mobile = extractMobileMediaBlock(css);
    expect(mobile).toMatch(
      /\.top-bar__menu-button:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--color-bg-cream\)/,
    );
    expect(css).toMatch(
      /\.mobile-nav-drawer__close:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--color-bg-cream\)/,
    );
  });
});
