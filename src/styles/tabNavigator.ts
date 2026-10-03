import {
  Action,
  Black,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from './colors';
import {Platform, useWindowDimensions} from 'react-native';
import {MaterialTopTabNavigationOptions} from '@react-navigation/material-top-tabs';
import {useTheme} from 'styled-components/native';
import {useAppSelector} from '../utils/hooks';

const gutter = 5;

/**
 * This bar's width, height and indicator are all fixed pixel values, so the
 * label can only grow as far as the pill can. `tabBarAllowFontScaling` is a
 * boolean (no max multiplier), so the cap is applied by scaling the geometry
 * and the label size together and turning OS scaling off.
 */
const MAX_TAB_FONT_SCALE = 1.4;

export const ScreenOptions = (
  {fontSize, numTabs, marginHorizontal, tabWidth, langAdjustments} = {
    fontSize: 16,
    numTabs: 2,
    marginHorizontal: gutter,
    tabWidth: 150,
    langAdjustments: false,
  },
): MaterialTopTabNavigationOptions => {
  const {dark} = useTheme();
  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const {fontScale, width: screenWidth} = useWindowDimensions();
  const baseWidth = tabWidth * numTabs + gutter * 4;
  const scale = Math.min(
    fontScale,
    MAX_TAB_FONT_SCALE,
    Math.max(1, (screenWidth - 24) / baseWidth),
  );
  const totalWidth = baseWidth * scale;

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
      case 'ru':
        return {
          tabBarIndicatorHeight: 76,
          tabBarHeight: 86,
          paddingVerticalIos: 0,
          paddingVerticalAndroid: 0,
        };
      case 'de':
      case 'ja':
      case 'nl':
      case 'pt':
        return {
          tabBarIndicatorHeight: 58,
          tabBarHeight: 68,
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
    tabBarAllowFontScaling: false,
    tabBarIndicatorStyle: {
      height:
        (langAdjustments
          ? getLangAdjustments(defaultLanguage).tabBarIndicatorHeight
          : 46) * scale,
      borderRadius: 50,
      backgroundColor: Action,
      width: tabWidth * scale,
      margin: gutter,
      marginHorizontal: marginHorizontal * scale,
    },
    tabBarActiveTintColor: White,
    tabBarInactiveTintColor: dark ? White : SlateDark,
    tabBarPressColor: dark ? Black : NeutralSlate,
    tabBarLabelStyle: {
      fontSize: fontSize * scale,
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
      height:
        (langAdjustments
          ? getLangAdjustments(defaultLanguage).tabBarHeight
          : 56) * scale,
    },
  };
};
