/**
 * Color ramps: one family per hue, each with the same 10 steps.
 *
 * - A step is a lightness level (OKLCH L), the same in every family:
 *   50 .97 · 100 .93 · 200 .87 · 300 .80 · 400 .72 · 500 .63 · 600 .55 ·
 *   700 .47 · 800 .38 · 900 .28 (±.04). So Green500 and Red500 look equally
 *   light, and contrast is predictable by step. colors.spec.ts checks this.
 * - Each scenario uses the same step in every family (see colorRoles.ts):
 *   tint background 100 / dark 900, colored text and outlines 700 / dark 400,
 *   status circles 700 / dark 500.
 * - To add a shade or a family, pick a color at the step's lightness with the
 *   family's hue (any OKLCH picker; the test allows 10° of hue). Room for
 *   in-between steps (450, 950).
 * - Components use the roles in src/themes/colorRoles.ts, not these directly.
 *
 * Each family has one hue, taken from its main shade (Action, SuccessDark,
 * WarningDark, Caution). Existing colors that sit on a step keep their exact
 * value there, and their older names further down are aliases
 * (Action = Blue700). Older colors that don't fit the ladder keep their values
 * for now: BitPay, Caution60, Caution70, CautionBright, Warning, and the light
 * tints Success25/50, Success, Caution25/50 and Warning25/75 (a different hue).
 * Both kinds will be retired as screens move to the roles.
 */

/* Blue */
export const Blue50 = '#F1F5FF';
export const Blue100 = '#ECEFFD';
export const Blue200 = '#C2D4FE';
export const Blue300 = '#A1BCFF';
export const Blue400 = '#7CA0FE';
export const Blue500 = '#4989FF';
export const Blue600 = '#3B62E8';
export const Blue700 = '#2240C4';
export const Blue800 = '#19329E';
export const Blue900 = '#0C204E';

/* Green */
export const Green50 = '#E6FBEE';
export const Green100 = '#D1F1DD';
export const Green200 = '#AAE4C2';
export const Green300 = '#7ED3A4';
export const Green400 = '#51BD86';
export const Green500 = '#2FA06C';
export const Green600 = '#038755';
export const Green700 = '#0B754A';
export const Green800 = '#015030';
export const Green900 = '#02321D';

/* Amber */
export const Amber50 = '#FFF3EA';
export const Amber100 = '#FFE2CC';
export const Amber200 = '#F6CAAA';
export const Amber300 = '#F0AD7A';
export const Amber400 = '#DE9050';
export const Amber500 = '#C07432';
export const Amber600 = '#A05708';
export const Amber700 = '#884800';
export const Amber800 = '#653401';
export const Amber900 = '#401F00';

/* Red */
export const Red50 = '#FEF2F0';
export const Red100 = '#FEE0DB';
export const Red200 = '#FFC4BB';
export const Red300 = '#FFA194';
export const Red400 = '#FF7363';
export const Red500 = '#E44F41';
export const Red600 = '#C83228';
export const Red700 = '#B51B16';
export const Red800 = '#810103';
export const Red900 = '#530102';

/* Primary */
export const Midnight = Blue900;
export const BitPay = '#1A3B8B';
export const Action = Blue700;

/* Secondary */
export const SlateDark = '#434D5A';
export const LuckySevens = '#777777';
/**
 * Placeholder text on light backgrounds (4.53:1 on White).
 */
export const Placeholder = '#6F7782';
export const Slate = '#9BA3AE';
export const NeutralSlate = '#F5F7F8';
export const Air = '#EBEDF8';
export const Cloud = '#F2F2F2';
export const Feather = '#F6F7FC';
export const GhostWhite = '#FBFBFF';

/* Neutrals */
/**
 * Use this value instead of true black to minimize black smearing on OLED devices.
 */
export const OledBlack = '#050505';
export const LightBlack = '#252525';
export const CharcoalBlack = '#111111';
/**
 * Dark-mode fill that still shows on LightBlack sheets: loading skeletons,
 * subtle fills and pressed rows. Already typed as #333333 in 23 places.
 */
export const Graphite = '#333333';
export const Black = '#000000';
export const Grey = '#E7E7E7';
export const White = '#FFFFFF';
export const Slate10 = '#F5F7F8';
export const Slate30 = '#E1E4E7';

/* Interface */
export const Caution = Red700;
export const Caution50 = '#FDAFBB';
export const Caution25 = '#FFD8DE';
export const Caution60 = '#ad1313';
/**
 * Readable danger text on Caution50 fills (4.73:1).
 */
export const Caution70 = '#9E1111';
/**
 * Readable danger text in dark mode (7.4:1 on Black, 5.4:1 on LightBlack).
 * Being retired: the ladder's dark-mode danger text is Red400.
 */
export const CautionBright = '#FF647C';

export const Success = '#2fcfa4';
export const Success50 = '#97E7D1';
export const Success25 = '#CBF3E8';
/**
 * Readable success text on light and Success25 fills (4.79:1 on Success25).
 */
export const SuccessDark = Green700;

export const Warning = '#AC6304';
export const Warning75 = '#FDC67F';
export const Warning25 = '#FEECD4';
/**
 * Readable warning text on Warning25 fills (4.70:1). Same value Bill status already used.
 */
export const WarningDark = Amber600;

export const Disabled = '#edeef0';
export const DisabledDark = '#3c3c3c';
export const DisabledText = '#bebec0';
export const DisabledTextDark = '#656565';

export const NotificationPrimary = '#1F3AB3';
export const ProgressBlue = '#4F6EF7';
export const LinkBlue = Blue500;
export const LightBlue = Blue100;

export const Overlay = '#111111';
