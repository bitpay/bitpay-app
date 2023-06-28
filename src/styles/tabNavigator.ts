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

const gutter = 5;

export const ScreenOptions = (
  {fontSize, numTabs, marginHorizontal, tabWidth} = {
    fontSize: 16,
    numTabs: 2,
    marginHorizontal: gutter,
    tabWidth: 150,
  },
): MaterialTopTabNavigationOptions => {
  const totalWidth = tabWidth * numTabs + gutter * 4;
  const {dark} = useTheme();

  return {
    swipeEnabled: false,
    tabBarIndicatorStyle: {
      height: 46,
      borderRadius: 50,
      backgroundColor: Action,
      width: tabWidth,
      margin: gutter,
      marginHorizontal,
    },
    tabBarActiveTintColor: White,
    tabBarInactiveTintColor: dark ? White : SlateDark,
    tabBarPressColor: dark ? Black : NeutralSlate,
    tabBarLabelStyle: {
      fontSize,
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
      backgroundColor: dark ? LightBlack : NeutralSlate,
      elevation: 0,
      height: 56,
    },
  };
};
