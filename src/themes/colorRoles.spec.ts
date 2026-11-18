import {contrast} from '../styles/colorTestUtils';
import {ColorRoles, DarkColorRoles, LightColorRoles} from './colorRoles';

type Role = keyof ColorRoles;

// The plain backgrounds text can sit on.
const NEUTRAL: Role[] = [
  'bgScreen',
  'bgCard',
  'bgSheet',
  'bgSubtle',
  'bgHighlight',
];

// Every surface an icon can sit on, including the subtle fill inside sheets.
const SURFACES: Role[] = ['bgScreen', 'bgCard', 'bgSheet', 'bgSubtleOnSheet'];

// [foreground, backgrounds, minimum ratio]
const RULES: [Role, Role[], number][] = [
  ['textPrimary', NEUTRAL, 4.5],
  ['textSecondary', NEUTRAL, 4.5],
  ['textLink', NEUTRAL, 4.5],
  ['textDanger', NEUTRAL, 4.5],
  ['textSuccess', NEUTRAL, 4.5],
  ['textWarning', NEUTRAL, 4.5],
  ['textGain', NEUTRAL, 4.5],
  ['textLoss', NEUTRAL, 4.5],
  // Text fields sit on white in light mode, so placeholders are checked there.
  ['textPlaceholder', ['bgScreen', 'bgCard', 'bgSheet'], 4.5],
  ['textQuickActionLabel', ['bgScreen'], 4.5],
  ['textOnHighlight', ['bgHighlight'], 4.5],
  ['textOnAction', ['bgAction'], 4.5],
  ['textOnDanger', ['bgDanger'], 4.5],
  ['textDanger', ['bgDangerTint'], 4.5],
  ['textSuccess', ['bgSuccessTint'], 4.5],
  ['textWarning', ['bgWarningTint'], 4.5],
  ['borderInput', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['borderFocus', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['borderSelected', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['borderDanger', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['iconDefault', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['iconAccent', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['iconOnFill', ['bgAction', 'bgQuickAction'], 3],
  // Cancel pill label on its subtle fill.
  ['textOnSubtle', ['bgSubtle'], 4.5],
  // Status icons (info, success, warning, error): the white symbol on its
  // shape, and the shape on every surface and on its own tint (3:1, graphics).
  ['iconOnFill', ['iconInfo', 'iconSuccess', 'iconWarning', 'iconDanger'], 3],
  ['iconInfo', [...SURFACES, 'bgHighlight'], 3],
  ['iconSuccess', [...SURFACES, 'bgSuccessTint'], 3],
  ['iconWarning', [...SURFACES, 'bgWarningTint'], 3],
  ['iconDanger', [...SURFACES, 'bgDangerTint'], 3],
  // Subtle fill inside a sheet: text, links and icons.
  ['textPrimary', ['bgSubtleOnSheet'], 4.5],
  ['textSecondary', ['bgSubtleOnSheet'], 4.5],
  ['textLink', ['bgSubtleOnSheet'], 4.5],
  ['iconDefault', ['bgSubtleOnSheet'], 3],
  ['iconAccent', ['bgSubtleOnSheet'], 3],
  // Pressed rows keep their text readable.
  ['textPrimary', ['bgPressed'], 4.5],
  ['textSecondary', ['bgPressed'], 4.5],
  // Switches: both states visible on every surface they sit on.
  ['controlOn', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['controlOff', ['bgScreen', 'bgCard', 'bgSheet'], 3],
  ['spinner', ['bgScreen', 'bgCard', 'bgSheet'], 3],
];

describe.each([
  ['light', LightColorRoles],
  ['dark', DarkColorRoles],
])('color roles in %s mode', (_mode, roles) => {
  it.each(RULES)('%s passes on %p (min %d:1)', (fg, backgrounds, min) => {
    for (const bg of backgrounds) {
      const ratio = contrast(roles[fg], roles[bg]);
      if (ratio < min) {
        throw new Error(
          `${fg} ${roles[fg]} on ${bg} ${roles[bg]} is ${ratio.toFixed(
            2,
          )}:1, needs ${min}:1`,
        );
      }
    }
  });
});
