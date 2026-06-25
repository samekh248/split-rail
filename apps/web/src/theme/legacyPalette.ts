/** Legacy slate/blue hex values forbidden in apps/web/src/index.css after migration */
export const LEGACY_HEX_DENYLIST = [
  '#1e293b',
  '#2563eb',
  '#64748b',
  '#e2e8f0',
  '#f8fafc',
  '#cbd5e1',
  '#475569',
  '#f6f7f9',
  '#f1f5f9',
  '#0f172a',
] as const;

export type LegacyHexException = {
  hex: string;
  reason: string;
  context?: string;
};

/** Documented allowances only — default empty per SPLR-95 contract */
export const LEGACY_HEX_EXCEPTIONS: readonly LegacyHexException[] = [];

/** Returns denylist hex values found in css (lowercased scan), minus documented exceptions. */
export function findLegacyHexViolations(
  css: string,
  denylist: readonly string[] = LEGACY_HEX_DENYLIST,
  exceptions: readonly LegacyHexException[] = LEGACY_HEX_EXCEPTIONS,
): string[] {
  const lower = css.toLowerCase();
  const allowed = new Set(exceptions.map((entry) => entry.hex.toLowerCase()));
  const violations: string[] = [];

  for (const hex of denylist) {
    const normalized = hex.toLowerCase();
    if (allowed.has(normalized)) continue;
    if (lower.includes(normalized)) {
      violations.push(hex);
    }
  }

  return violations;
}
