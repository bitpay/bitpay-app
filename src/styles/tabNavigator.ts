import {Action, NeutralSlate, SlateDark, White} from './colors';
import {Platform} from 'react-native';
import {MaterialTopTabNavigationOptions} from '@react-navigation/material-top-tabs';

export const ScreenOptions = (
  width: number,
): MaterialTopTabNavigationOptions => {
  const gutter = 8;
  const totalWidth = width * 2 + gutter * 4;

  return {
    swipeEnabled: false,
    tabBarIndicatorStyle: {
      height: 40,
      borderRadius: 50,
      backgroundColor: Action,
      width: width,
      margin: gutter,
    },
    tabBarActiveTintColor: White,
    tabBarInactiveTintColor: SlateDark,
    tabBarPressColor: NeutralSlate,
    tabBarLabelStyle: {
      fontSize: 16,
      textTransform: 'none',
      fontWeight: '500',
      paddingVertical: Platform.select({
        ios: 4,
        android: 2,
      }),
    },
    tabBarStyle: {
      width: totalWidth,
      alignSelf: 'center',
      borderRadius: 50,
      backgroundColor: NeutralSlate,
      elevation: 0,
      height: 56,
    },
  };
};
