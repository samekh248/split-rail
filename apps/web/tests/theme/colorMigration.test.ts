import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

const WHITE_SURFACE_SELECTORS = [
  '.settings-nav__item',
  '.settings-layout__content',
  '.team-confirm',
  '.upcoming-view-toggle',
  '.upcoming-mini-calendar__day',
  '.financial-health-widget',
  '.unassigned-drawer__panel',
  '.unassigned-drawer__workspace-link',
  '.venue-qbo-status-card',
] as const;

const WHITE_TEXT_SELECTORS = ['.dashboard-empty__cta', '.settings-layout__header'] as const;

const FORBIDDEN_SUCCESS_HEX = ['#ecfdf5', '#065f46', '#6ee7b7', '#f0fdf4', '#15803d'] as const;
const FORBIDDEN_ERROR_HEX = ['#dc2626', '#991b1b', '#fef2f2', '#b91c1c'] as const;
const FORBIDDEN_SESSION_HEX = ['#fef3c7', '#fcd34d', '#92400e'] as const;

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function selectorBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\n\\}`));
  expect(match, `block for ${selector}`).toBeTruthy();
  return match![0];
}

describe('colorMigration (SPLR-91)', () => {
  describe('US1 white shorthand and session notice', () => {
    it.each(WHITE_SURFACE_SELECTORS)('%s uses surface white token for background', (selector) => {
      const block = selectorBlock(readIndexCss(), selector);
      expect(block).toMatch(/background:\s*var\(--color-surface-white\)/);
      expect(block.toLowerCase()).not.toMatch(/background:\s*#fff\b/);
    });

    it.each(WHITE_TEXT_SELECTORS)('%s uses text-on-dark token for light text', (selector) => {
      const block = selectorBlock(readIndexCss(), selector);
      expect(block).toMatch(/color:\s*var\(--color-text-on-dark\)/);
      expect(block.toLowerCase()).not.toMatch(/color:\s*#fff\b/);
    });

    it('session notice uses warning tokens', () => {
      const block = selectorBlock(readIndexCss(), '.session-expired-notice');
      expect(block).toMatch(/background:\s*var\(--color-warning-bg\)/);
      expect(block).toMatch(/border:\s*1px solid var\(--color-warning-border\)/);
      expect(block).toMatch(/color:\s*var\(--color-warning-text\)/);
      for (const hex of FORBIDDEN_SESSION_HEX) {
        expect(block.toLowerCase()).not.toContain(hex);
      }
    });
  });

  describe('US3 success feedback', () => {
    it('team success banner uses success tokens', () => {
      const block = selectorBlock(readIndexCss(), '.team-section__banner--success');
      expect(block).toMatch(/background:\s*var\(--color-success-bg\)/);
      expect(block).toMatch(/color:\s*var\(--color-success\)/);
      for (const hex of FORBIDDEN_SUCCESS_HEX) {
        expect(block.toLowerCase()).not.toContain(hex);
      }
    });

    it('unassigned drawer success uses success tokens', () => {
      const block = selectorBlock(readIndexCss(), '.unassigned-drawer__success');
      expect(block).toMatch(/background:\s*var\(--color-success-bg\)/);
      expect(block).toMatch(/color:\s*var\(--color-success\)/);
      expect(block).toMatch(/border:\s*1px solid var\(--color-success-border\)/);
      for (const hex of FORBIDDEN_SUCCESS_HEX) {
        expect(block.toLowerCase()).not.toContain(hex);
      }
    });
  });

  describe('US3 error feedback', () => {
    it('team error banner uses error tokens', () => {
      const block = selectorBlock(readIndexCss(), '.team-section__banner--error');
      expect(block).toMatch(/background:\s*var\(--color-error-bg\)/);
      expect(block).toMatch(/color:\s*var\(--color-error\)/);
      for (const hex of FORBIDDEN_ERROR_HEX) {
        expect(block.toLowerCase()).not.toContain(hex);
      }
    });

    it('unassigned drawer error uses error tokens', () => {
      const block = selectorBlock(readIndexCss(), '.unassigned-drawer__error');
      expect(block).toMatch(/background:\s*var\(--color-error-bg\)/);
      expect(block).toMatch(/color:\s*var\(--color-error\)/);
      for (const hex of FORBIDDEN_ERROR_HEX) {
        expect(block.toLowerCase()).not.toContain(hex);
      }
    });

    it('team modal and confirm errors use error token', () => {
      for (const selector of ['.team-modal__error', '.team-confirm__error'] as const) {
        const block = selectorBlock(readIndexCss(), selector);
        expect(block).toMatch(/color:\s*var\(--color-error\)/);
        expect(block.toLowerCase()).not.toContain('#dc2626');
      }
    });
  });
});
