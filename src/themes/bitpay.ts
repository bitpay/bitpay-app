import {DarkTheme, DefaultTheme, Theme} from '@react-navigation/native';
import {
  Action,
  BitPay,
  Black,
  LinkBlue,
  Slate30,
  SlateDark,
  White,
} from '../styles/colors';
import {ColorRoles, DarkColorRoles, LightColorRoles} from './colorRoles';

// The color roles live in colorRoles.ts; re-exported here for convenience.
export type {ColorRoles} from './colorRoles';
export {DarkColorRoles, LightColorRoles} from './colorRoles';

export type BitPayTheme = Theme & {
  colors: ColorRoles & {
    link: string;
    description: string;
  };
};

export const BitPayLightTheme: BitPayTheme = {
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    ...LightColorRoles,

    primary: BitPay,
    background: White,
    card: DefaultTheme.colors.card,
    text: Black,
    link: Action,
    description: SlateDark,
    border: DefaultTheme.colors.border,
    notification: DefaultTheme.colors.notification,
  },
  fonts: DefaultTheme.fonts,
};

export const BitPayDarkTheme: BitPayTheme = {
  dark: true,
  colors: {
    ...DarkTheme.colors,
    ...DarkColorRoles,

    primary: BitPay,
    background: Black,
    card: DarkTheme.colors.card,
    text: White,
    link: LinkBlue,
    description: Slate30,
    border: DarkTheme.colors.border,
    notification: DarkTheme.colors.notification,
  },
  fonts: DarkTheme.fonts,
};
