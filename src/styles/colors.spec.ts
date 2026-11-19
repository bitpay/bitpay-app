import * as colors from './colors';
import {contrast, oklch} from './colorTestUtils';

// Checks the color ramps described at the top of colors.ts: every step has
// the same lightness in every family, tint steps share one chroma, each
// family keeps one hue, and every scenario rule passes for every family. A
// new family or a changed shade has to pass these too.

const FAMILIES = ['Blue', 'Green', 'Amber', 'Red'] as const;

// Step -> target OKLCH lightness.
const STEPS: [number, number][] = [
  [50, 0.97],
  [100, 0.93],
  [200, 0.87],
  [300, 0.8],
  [400, 0.72],
  [500, 0.63],
  [600, 0.55],
  [700, 0.47],
  [800, 0.38],
  [900, 0.28],
];
const LIGHTNESS_TOLERANCE = 0.04;
// Smallest lightness drop between neighboring steps.
const MIN_STEP_GAP = 0.03;
// Every shade within this many degrees of the family's 700 hue.
const HUE_TOLERANCE = 10;

// Tint steps share one chroma (saturation) across families.
// Step -> target OKLCH chroma.
const TINT_CHROMA: [number, number][] = [
  [50, 0.014],
  [100, 0.035],
  [200, 0.063],
  [900, 0.065],
];
const CHROMA_TOLERANCE = 0.003;

const palette = colors as unknown as Record<string, string>;
const shade = (family: string, step: number): string => {
  const value = palette[`${family}${step}`];
  if (!value) {
    throw new Error(`${family}${step} is missing from colors.ts`);
  }
  return value;
};

const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe.each(FAMILIES)('%s ramp', family => {
  it.each(STEPS)('step %d is at lightness %s', (step, target) => {
    const {lightness} = oklch(shade(family, step));
    expect(Math.abs(lightness - target)).toBeLessThanOrEqual(
      LIGHTNESS_TOLERANCE,
    );
  });

  // The ±.04 band is wide, so also check the steps never overlap: each one is
  // clearly darker than the one before.
  it('each step is darker than the one before', () => {
    for (let i = 1; i < STEPS.length; i++) {
      const lighter = oklch(shade(family, STEPS[i - 1][0])).lightness;
      const darker = oklch(shade(family, STEPS[i][0])).lightness;
      expect(lighter - darker).toBeGreaterThanOrEqual(MIN_STEP_GAP);
    }
  });

  it.each(TINT_CHROMA)('tint step %d is at chroma %s', (step, target) => {
    const {chroma} = oklch(shade(family, step));
    expect(Math.abs(chroma - target)).toBeLessThanOrEqual(CHROMA_TOLERANCE);
  });

  it.each(STEPS)('step %d keeps the family hue', step => {
    const familyHue = oklch(shade(family, 700)).hue;
    const {hue} = oklch(shade(family, step));
    expect(hueDistance(hue, familyHue)).toBeLessThanOrEqual(HUE_TOLERANCE);
  });

  // [what, foreground, background, minimum ratio]
  const rules: [string, string, string, number][] = [
    // Light mode
    ['text 700 on white', shade(family, 700), colors.White, 4.5],
    ['text 700 on tint 100', shade(family, 700), shade(family, 100), 4.5],
    ['white text on fill 700', colors.White, shade(family, 700), 4.5],
    // Dark mode
    ['text 400 on screen', shade(family, 400), colors.Black, 4.5],
    ['text 400 on card', shade(family, 400), colors.CharcoalBlack, 4.5],
    ['text 400 on sheet', shade(family, 400), colors.LightBlack, 4.5],
    ['text 400 on subtle fill', shade(family, 400), colors.Graphite, 4.5],
    ['text 400 on tint 900', shade(family, 400), shade(family, 900), 4.5],
    ['white symbol on shape 500', colors.White, shade(family, 500), 3],
    ['shape 500 on screen', shade(family, 500), colors.Black, 3],
    ['shape 500 on sheet', shade(family, 500), colors.LightBlack, 3],
    ['shape 500 on subtle fill', shade(family, 500), colors.Graphite, 3],
    ['shape 500 on tint 900', shade(family, 500), shade(family, 900), 3],
  ];

  it.each(rules)('%s', (_what, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
