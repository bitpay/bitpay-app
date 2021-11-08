import {DarkTheme, DefaultTheme, Theme} from '@react-navigation/native';
import {BitPay, Black, White} from '../styles/colors';

export type BitPayTheme = Theme & {
  colors: {
    // TODO: add additional color use cases
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
    border: DefaultTheme.colors.border,
    notification: DefaultTheme.colors.notification,
  },
};

export const BitPayDarkTheme: BitPayTheme = {
  dark: true,
  colors: {
    ...DarkTheme.colors,

    primary: BitPay,
    background: Black,
    card: DarkTheme.colors.card,
    text: White,
    border: DarkTheme.colors.border,
    notification: DarkTheme.colors.notification,
  },
};
