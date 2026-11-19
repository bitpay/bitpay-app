// Color math shared by the color tests (colors.spec.ts, colorRoles.spec.ts).

// Linear sRGB channels of a 6-digit hex color. Anything else (short hex,
// alpha, rgba) throws, so a test can't pass silently on a value it can't read.
const linearChannels = (hex: string): [number, number, number] => {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`${hex} is not a 6-digit hex color`);
  }
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return [r, g, b];
};

// WCAG 2.x contrast ratio.
export const contrast = (a: string, b: string): number => {
  const luminance = (hex: string) => {
    const [r, g, bl] = linearChannels(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// OKLCH lightness (0-1), chroma (saturation, 0 = grey) and hue (degrees),
// from Björn Ottosson's Oklab.
export const oklch = (
  hex: string,
): {lightness: number; chroma: number; hue: number} => {
  const [r, g, b] = linearChannels(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return {lightness, chroma: Math.hypot(A, B), hue};
};
