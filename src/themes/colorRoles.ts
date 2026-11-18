import {
  Amber100,
  Amber400,
  Amber500,
  Amber700,
  Amber900,
  Black,
  Blue100,
  Blue400,
  Blue500,
  Blue700,
  Blue900,
  CharcoalBlack,
  Disabled,
  DisabledDark,
  DisabledText,
  DisabledTextDark,
  Graphite,
  Green100,
  Green400,
  Green500,
  Green700,
  Green900,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  Overlay,
  Placeholder,
  Red100,
  Red300,
  Red400,
  Red500,
  Red700,
  Red800,
  Red900,
  Slate,
  Slate30,
  SlateDark,
  White,
} from '../styles/colors';

/**
 * Color roles: one name per job, each with a light and a dark value.
 * Components ask for the job (e.g. `theme.colors.textSecondary`), never a
 * color from colors.ts or `theme.dark ? A : B`.
 *
 * Colored roles follow one rule per scenario, the same step in every family
 * (Blue, Green, Amber, Red; see colors.ts):
 * - tint background: 100, dark 900
 * - colored text, outlines, focus, accent icons, spinner: 700, dark 400
 * - filled shapes with a white symbol or thumb (status icons, switch on): 700,
 *   dark 500
 * - buttons with white text: 700 in both modes
 * - soft danger button in dark mode: Red300 fill, Red800 text
 *
 * colorRoles.spec.ts checks the pairs listed there: text 4.5:1 and icons,
 * outlines, controls and spinners 3:1 on the backgrounds each one is used on.
 * Not checked: disabled and skeleton colors (exempt) and placeholders on
 * bgSubtle (light text fields sit on white).
 *
 * This file only depends on colors.ts, so code outside React components
 * (helpers that take an isDarkMode flag) can use the roles too.
 */
export type ColorRoles = {
  // Backgrounds. Dark mode has three levels: screen, then card, then sheet.
  bgScreen: string;
  bgCard: string;
  bgSheet: string;
  bgSubtle: string;
  // Subtle fill inside a sheet. In dark mode bgSubtle matches the sheet, so this
  // one is lighter.
  bgSubtleOnSheet: string;
  bgHighlight: string;
  bgQuickAction: string;
  bgAction: string;
  bgDanger: string;
  bgDangerTint: string;
  bgSuccessTint: string;
  bgWarningTint: string;
  bgDisabled: string;
  bgSkeleton: string;
  // A row or card while it is being pressed (shows on screen, card and sheet).
  bgPressed: string;
  bgOverlay: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textPlaceholder: string;
  textLink: string;
  textOnHighlight: string;
  textOnAction: string;
  textOnDanger: string;
  textDanger: string;
  textSuccess: string;
  textWarning: string;
  // Price and balance changes. Always shown with an arrow or +/- sign too.
  textGain: string;
  textLoss: string;
  textQuickActionLabel: string;
  // Label on a subtle-fill button, such as the Cancel pill.
  textOnSubtle: string;
  textDisabled: string;
  // Borders
  borderDefault: string;
  borderInput: string;
  borderFocus: string;
  borderSelected: string;
  borderDanger: string;
  // Controls (on/off switches). Both states need 3:1 against the background.
  controlOn: string;
  controlOff: string;
  // Icons
  iconDefault: string;
  iconAccent: string;
  iconOnFill: string;
  // Status icons (info, success, warning, error) and gain/loss arrow badges:
  // the filled shape (step 500 in dark mode). The symbol on top is iconOnFill
  // (White in both modes): 3:1 or more on every shape, and every shape is 3:1
  // or more on every background it sits on, including its own tint.
  iconInfo: string;
  iconSuccess: string;
  iconWarning: string;
  iconDanger: string;
  spinner: string;
};

export const LightColorRoles: ColorRoles = {
  bgScreen: White,
  bgCard: White,
  bgSheet: White,
  bgSubtle: NeutralSlate,
  bgSubtleOnSheet: NeutralSlate,
  bgHighlight: Blue100,
  bgQuickAction: Blue700,
  bgAction: Blue700,
  bgDanger: Red700,
  bgDangerTint: Red100,
  bgSuccessTint: Green100,
  bgWarningTint: Amber100,
  bgDisabled: Disabled,
  bgSkeleton: Slate30,
  bgPressed: NeutralSlate,
  bgOverlay: Overlay,
  textPrimary: Black,
  textSecondary: SlateDark,
  textPlaceholder: Placeholder,
  textLink: Blue700,
  textOnHighlight: Blue700,
  textOnAction: White,
  textOnDanger: White,
  textDanger: Red700,
  textSuccess: Green700,
  textWarning: Amber700,
  textGain: Green700,
  textLoss: Red700,
  textQuickActionLabel: Blue900,
  textOnSubtle: SlateDark,
  textDisabled: DisabledText,
  borderDefault: Slate30,
  borderInput: LuckySevens,
  borderFocus: Blue700,
  borderSelected: Blue700,
  borderDanger: Red700,
  controlOn: Blue700,
  controlOff: LuckySevens,
  iconDefault: SlateDark,
  iconAccent: Blue700,
  iconOnFill: White,
  iconInfo: Blue700,
  iconSuccess: Green700,
  iconWarning: Amber700,
  iconDanger: Red700,
  spinner: Blue700,
};

export const DarkColorRoles: ColorRoles = {
  bgScreen: Black,
  bgCard: CharcoalBlack,
  bgSheet: LightBlack,
  bgSubtle: LightBlack,
  bgSubtleOnSheet: Graphite,
  bgHighlight: Blue900,
  bgQuickAction: Blue900,
  bgAction: Blue700,
  bgDanger: Red300,
  bgDangerTint: Red900,
  bgSuccessTint: Green900,
  bgWarningTint: Amber900,
  bgDisabled: DisabledDark,
  bgSkeleton: Graphite,
  bgPressed: Graphite,
  bgOverlay: Overlay,
  textPrimary: White,
  textSecondary: Slate30,
  textPlaceholder: Slate,
  textLink: Blue400,
  textOnHighlight: White,
  textOnAction: White,
  textOnDanger: Red800,
  textDanger: Red400,
  textSuccess: Green400,
  textWarning: Amber400,
  textGain: Green400,
  textLoss: Red400,
  textQuickActionLabel: White,
  textOnSubtle: White,
  textDisabled: DisabledTextDark,
  borderDefault: SlateDark,
  borderInput: LuckySevens,
  borderFocus: Blue400,
  borderSelected: Blue400,
  borderDanger: Red400,
  controlOn: Blue500,
  controlOff: LuckySevens,
  iconDefault: Slate,
  iconAccent: Blue400,
  iconOnFill: White,
  iconInfo: Blue500,
  iconSuccess: Green500,
  iconWarning: Amber500,
  iconDanger: Red500,
  spinner: Blue400,
};
