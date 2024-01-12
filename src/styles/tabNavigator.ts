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
import {useAppSelector} from '../utils/hooks';

const gutter = 5;

export const ScreenOptions = (
  {fontSize, numTabs, marginHorizontal, tabWidth, langAdjustments} = {
    fontSize: 16,
    numTabs: 2,
    marginHorizontal: gutter,
    tabWidth: 150,
    langAdjustments: false,
  },
): MaterialTopTabNavigationOptions => {
  const totalWidth = tabWidth * numTabs + gutter * 4;
  const {dark} = useTheme();
  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);

  const getLangAdjustments = (
    lang: string,
  ): {
    tabBarIndicatorHeight: number;
    tabBarHeight: number;
    paddingVerticalIos: number;
    paddingVerticalAndroid: number;
  } => {
    switch (lang) {
      case 'fr':
      case 'ja':
      case 'ru':
        return {
          tabBarIndicatorHeight: 64,
          tabBarHeight: 74,
          paddingVerticalIos: 0,
          paddingVerticalAndroid: 0,
        };
      case 'de':
      case 'es':
      case 'nl':
      case 'pt':
        return {
          tabBarIndicatorHeight: 54,
          tabBarHeight: 64,
          paddingVerticalIos: 1,
          paddingVerticalAndroid: 0,
        };
      default:
        return {
          tabBarIndicatorHeight: 46,
          tabBarHeight: 56,
          paddingVerticalIos: 4,
          paddingVerticalAndroid: 2,
        };
    }
  };

  return {
    swipeEnabled: false,
    tabBarIndicatorStyle: {
      height: langAdjustments
        ? getLangAdjustments(defaultLanguage).tabBarIndicatorHeight
        : 46,
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
        ios: langAdjustments
          ? getLangAdjustments(defaultLanguage).paddingVerticalIos
          : 4,
        android: langAdjustments
          ? getLangAdjustments(defaultLanguage).paddingVerticalAndroid
          : 2,
      }),
    },
    tabBarStyle: {
      width: totalWidth,
      alignSelf: 'center',
      borderRadius: 50,
      backgroundColor: dark ? LightBlack : NeutralSlate,
      elevation: 0,
      height: langAdjustments
        ? getLangAdjustments(defaultLanguage).tabBarHeight
        : 56,
    },
  };
};
