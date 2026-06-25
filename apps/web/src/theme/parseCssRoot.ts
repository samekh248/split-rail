/** Parse `:root` custom properties from raw CSS text (no DOM). */

const ROOT_BLOCK_RE = /:root\s*\{([\s\S]*?)\n\}/;
const CUSTOM_PROPERTY_RE = /(--[\w-]+)\s*:\s*([^;]+)/g;

export function extractRootBlock(css: string): string {
  const match = css.match(ROOT_BLOCK_RE);
  if (!match) {
    throw new Error(':root block not found in CSS');
  }
  return match[1];
}

export function parseRootCustomProperties(css: string): Map<string, string> {
  const root = extractRootBlock(css);
  const properties = new Map<string, string>();

  for (const match of root.matchAll(CUSTOM_PROPERTY_RE)) {
    properties.set(match[1], match[2].trim());
  }

  return properties;
}

/** Expand #RGB to #RRGGBB and lowercase for case-insensitive comparison. */
export function normalizeHex(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    throw new Error(`invalid hex value: ${value}`);
  }

  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
}

/** Normalize rgba() whitespace for stable string comparison. */
export function normalizeRgba(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/,
  );
  if (!match) {
    throw new Error(`invalid rgba value: ${value}`);
  }

  const alpha = Number(match[4]);
  const alphaStr = Number.isInteger(alpha) ? String(alpha) : String(alpha);
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alphaStr})`;
}

export type RootTokenCompareMode = 'hex' | 'rgba' | 'exact';

export function compareRootTokenValue(
  actual: string,
  expected: string,
  mode: RootTokenCompareMode,
): boolean {
  if (mode === 'exact') {
    return actual.trim() === expected.trim();
  }
  if (mode === 'hex') {
    return normalizeHex(actual) === normalizeHex(expected);
  }
  return normalizeRgba(actual) === normalizeRgba(expected);
}
