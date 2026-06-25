import { describe, expect, it } from 'vitest';
import { findLegacyHexViolations, LEGACY_HEX_DENYLIST } from '@/theme/legacyPalette';

describe('legacyPalette module', () => {
  it('exports a non-empty denylist including SPLR-95 minimum legacy colors', () => {
    const denylist = LEGACY_HEX_DENYLIST.map((hex) => hex.toLowerCase());
    expect(denylist.length).toBeGreaterThan(0);
    expect(denylist).toContain('#1e293b');
    expect(denylist).toContain('#2563eb');
  });

  it('findLegacyHexViolations detects denylisted hex in css text', () => {
    expect(findLegacyHexViolations('color: #2563eb;')).toEqual(['#2563eb']);
    expect(findLegacyHexViolations('color: var(--color-primary-brown);')).toEqual([]);
  });
});
