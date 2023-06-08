import {
  Action,
  Black,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from './colors';
import {Platform} from 'react-native';
import {MaterialTopTabNavigationOptions} from '@react-navigation/material-top-tabs';
import {useTheme} from 'styled-components/native';

export const ScreenOptions = (
  width: number,
): MaterialTopTabNavigationOptions => {
  const gutter = 5;
  const totalWidth = width * 2 + gutter * 4;
  const {dark} = useTheme();

  return {
    swipeEnabled: false,
    tabBarIndicatorStyle: {
      height: 46,
      borderRadius: 50,
      backgroundColor: Action,
      width: width,
      margin: gutter,
    },
    tabBarActiveTintColor: White,
    tabBarInactiveTintColor: dark ? White : SlateDark,
    tabBarPressColor: dark ? Black : NeutralSlate,
    tabBarLabelStyle: {
      fontSize: 16,
      textTransform: 'none',
      fontWeight: '500',
      paddingVertical: Platform.select({
        macos: 4,
        ios: 4,
        android: 2,
      }),
    },
    tabBarStyle: {
      width: totalWidth,
      alignSelf: 'center',
      borderRadius: 50,
      backgroundColor: dark ? LightBlack : NeutralSlate,
      elevation: 0,
      height: 56,
    },
  };
};
