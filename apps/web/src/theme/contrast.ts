/** Parse #RRGGBB hex to sRGB 0–1 channels */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function relativeLuminance(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminanceFromHex(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * relativeLuminance(r) + 0.7152 * relativeLuminance(g) + 0.0722 * relativeLuminance(b);
}

/** WCAG 2.1 contrast ratio between two #RRGGBB colors */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = luminanceFromHex(foregroundHex);
  const l2 = luminanceFromHex(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAaNormalText(foregroundHex: string, backgroundHex: string): boolean {
  return contrastRatio(foregroundHex, backgroundHex) >= 4.5;
}
