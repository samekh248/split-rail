import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function css(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

describe('section header and event-workspace layout (spec 084)', () => {
  it('defines .event-workspace as a shared 1200px inset', () => {
    const source = css();
    expect(source).toMatch(/\.event-workspace\s*\{[^}]*max-width:\s*1200px/);
    expect(source).toMatch(/\.event-workspace\s*\{[^}]*margin:\s*0 auto/);
    expect(source).toMatch(/\.event-workspace\s*\{[^}]*padding:\s*1\.5rem 1\.25rem 2\.5rem/);
    expect(source).toMatch(/\.event-workspace\s*\{[^}]*gap:\s*1\.25rem/);
  });

  it('reduces .event-workspace padding at the 768px breakpoint', () => {
    const source = css();
    expect(source).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.event-workspace\s*\{[\s\S]*padding:\s*1rem 1rem 2rem/,
    );
  });

  it('does not give .event-ledger-page a competing max-width inset', () => {
    const source = css();
    const ledgerBlock = source.match(/\.event-ledger-page\s*\{[^}]+\}/)?.[0] ?? '';
    expect(ledgerBlock).not.toMatch(/max-width:\s*1200px/);
    expect(ledgerBlock).not.toMatch(/padding:\s*1\.5rem 1\.25rem 2\.5rem/);
  });

  it('does not give .festival-mode-card a page-level bottom margin', () => {
    const source = css();
    const cardBlock = source.match(/\.festival-mode-card\s*\{[^}]+\}/)?.[0] ?? '';
    expect(cardBlock).not.toMatch(/margin-bottom:\s*1rem/);
  });

  it('defines .section-header with trailing-edge actions', () => {
    const source = css();
    expect(source).toMatch(/\.section-header\s*\{[^}]*display:\s*flex/);
    expect(source).toMatch(/\.section-header\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(source).toMatch(/\.section-header\s*\{[^}]*justify-content:\s*space-between/);
    expect(source).toMatch(/\.section-header__actions\s*\{[^}]*margin-left:\s*auto/);
  });

  it('stacks .section-header at 768px with end-aligned actions', () => {
    const source = css();
    expect(source).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.section-header\s*\{[\s\S]*flex-direction:\s*column/,
    );
    expect(source).toMatch(
      /@media \(max-width: 768px\)[\s\S]*\.section-header__actions\s*\{[\s\S]*justify-content:\s*flex-end/,
    );
  });
});
