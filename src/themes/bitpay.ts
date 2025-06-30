import {DarkTheme, DefaultTheme, Theme} from '@react-navigation/native';
import {
  Action,
  Air,
  BitPay,
  Black,
  LinkBlue,
  OledBlack,
  SlateDark,
  White,
} from '../styles/colors';

export type BitPayTheme = Theme & {
  colors: {
    // TODO: add additional color use cases
    link: string;
    description: string;
  };
};

export const BitPayLightTheme: BitPayTheme = {
  dark: false,
  colors: {
    ...DefaultTheme.colors,

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

    primary: BitPay,
    background: OledBlack,
    card: DarkTheme.colors.card,
    text: White,
    link: LinkBlue,
    description: Air,
    border: DarkTheme.colors.border,
    notification: DarkTheme.colors.notification,
  },
  fonts: DarkTheme.fonts,
};
