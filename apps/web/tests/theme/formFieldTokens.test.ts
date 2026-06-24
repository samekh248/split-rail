import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_HEX_DENYLIST } from '@/theme/legacyPalette';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function selectorBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}[^{]*\\{[\\s\\S]*?\\n\\}`));
  expect(match, `block for ${selector}`).toBeTruthy();
  return match![0];
}

describe('formFieldTokens (SPLR-91 FR-003)', () => {
  it('uses token borders, focus ring, and error colors on form fields', () => {
    const css = readIndexCss();

    const input = selectorBlock(css, '.form-field__input');
    expect(input).toMatch(/border:\s*1px solid var\(--color-border-subtle\)/);
    expect(input).toMatch(/background:\s*var\(--color-surface-white\)/);
    expect(input).toMatch(/color:\s*var\(--color-primary-brown\)/);

    const focus = selectorBlock(css, '.form-field__input:focus-visible');
    expect(focus).toMatch(/outline:\s*2px solid var\(--color-focus-ring\)/);
    expect(focus).toMatch(/border-color:\s*var\(--color-accent-orange\)/);

    const invalid = selectorBlock(css, ".form-field__input[aria-invalid='true']");
    expect(invalid).toMatch(/border-color:\s*var\(--color-error\)/);

    const error = selectorBlock(css, '.form-field__error');
    expect(error).toMatch(/color:\s*var\(--color-error\)/);
  });

  it('does not use legacy blue or denylisted slate hex in form-field blocks', () => {
    const css = readIndexCss();
    const formFieldSection = css.slice(css.indexOf('.form-field {'));

    expect(formFieldSection.toLowerCase()).not.toContain('#2563eb');
    for (const hex of LEGACY_HEX_DENYLIST) {
      expect(formFieldSection.toLowerCase(), `legacy hex ${hex} in form fields`).not.toContain(
        hex.toLowerCase(),
      );
    }
  });
});
