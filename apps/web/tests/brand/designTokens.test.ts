import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findLegacyHexViolations, LEGACY_HEX_DENYLIST } from '@/theme/legacyPalette';
import { compareRootTokenValue, parseRootCustomProperties } from '@/theme/parseCssRoot';
import {
  requiredCssVariables,
  rootTokenParity,
  semanticAliasWiring,
} from '@/theme/tokens';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function parityMessage(token: string, expected: string, actual: string): string {
  return `token parity: ${token} expected ${expected} got ${actual}`;
}

describe('brand designTokens regression (SPLR-95)', () => {
  describe(':root primitive parity', () => {
    it('matches canonical values from tokens.ts rootTokenParity', () => {
      const props = parseRootCustomProperties(readIndexCss());

      for (const entry of rootTokenParity) {
        const actual = props.get(entry.cssVariable);
        expect(actual, `missing required :root variable: ${entry.cssVariable}`).toBeDefined();
        const matches = compareRootTokenValue(actual!, entry.expected, entry.compareMode);
        expect(
          matches,
          parityMessage(entry.cssVariable, entry.expected, actual!),
        ).toBe(true);
      }
    });
  });

  describe('requiredCssVariables presence', () => {
    it('defines every required :root CSS custom property in index.css', () => {
      const props = parseRootCustomProperties(readIndexCss());

      for (const variable of requiredCssVariables) {
        expect(
          props.has(variable),
          `missing required :root variable: ${variable}`,
        ).toBe(true);
      }
    });
  });

  describe('semantic alias wiring', () => {
    it('wires text-on-* aliases to canonical var() targets', () => {
      const props = parseRootCustomProperties(readIndexCss());

      for (const alias of semanticAliasWiring) {
        const actual = props.get(alias.cssVariable);
        expect(actual, `missing required :root variable: ${alias.cssVariable}`).toBeDefined();
        expect(
          compareRootTokenValue(actual!, alias.expected, 'exact'),
          parityMessage(alias.cssVariable, alias.expected, actual!),
        ).toBe(true);
      }
    });
  });

  describe('legacy hex denylist', () => {
    it('includes FR-004 minimum banned legacy colors in denylist source', () => {
      const denylist = LEGACY_HEX_DENYLIST.map((hex) => hex.toLowerCase());
      expect(denylist).toContain('#1e293b');
      expect(denylist).toContain('#2563eb');
    });

    it('contains no denylisted legacy hex values in index.css', () => {
      const violations = findLegacyHexViolations(readIndexCss());
      expect(
        violations,
        violations.length > 0
          ? `legacy hex denylist: found ${violations.join(', ')} in index.css`
          : undefined,
      ).toEqual([]);
    });
  });
});
