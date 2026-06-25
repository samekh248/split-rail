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

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
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

export type RgbaColor = { r: number; g: number; b: number; a: number };

/** Alpha-composite an sRGB foreground onto an opaque hex background */
export function compositeRgbaOnHex(rgba: RgbaColor, backgroundHex: string): string {
  const bg = hexToRgb(backgroundHex);
  const fg = { r: rgba.r / 255, g: rgba.g / 255, b: rgba.b / 255 };
  const blend = (fgChannel: number, bgChannel: number) =>
    Math.round((fgChannel * rgba.a + bgChannel * (1 - rgba.a)) * 255);
  return rgbToHex(blend(fg.r, bg.r), blend(fg.g, bg.g), blend(fg.b, bg.b));
}

export function meetsWcagAaNormalText(foregroundHex: string, backgroundHex: string): boolean {
  return contrastRatio(foregroundHex, backgroundHex) >= 4.5;
}

export function meetsWcagAaLargeText(foregroundHex: string, backgroundHex: string): boolean {
  return contrastRatio(foregroundHex, backgroundHex) >= 3.0;
}

export function meetsWcagAaUiComponent(foregroundHex: string, backgroundHex: string): boolean {
  return contrastRatio(foregroundHex, backgroundHex) >= 3.0;
}

export type ContrastPairingInput = {
  foreground: string;
  background: string;
  foregroundRgba?: RgbaColor;
};

/** Resolve effective opaque foreground hex for ratio measurement */
export function resolvePairingForeground(pairing: ContrastPairingInput): string {
  if (pairing.foregroundRgba) {
    return compositeRgbaOnHex(pairing.foregroundRgba, pairing.background);
  }
  return pairing.foreground;
}

export function pairingContrastRatio(pairing: ContrastPairingInput): number {
  return contrastRatio(resolvePairingForeground(pairing), pairing.background);
}
