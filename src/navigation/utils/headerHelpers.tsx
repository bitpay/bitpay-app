import React from 'react';
import {Platform} from 'react-native';
import {
  SafeAreaInsetsContext,
  initialWindowMetrics,
  EdgeInsets,
} from 'react-native-safe-area-context';
import CustomHeader from '../../components/navigation/CustomHeader';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';

type HeaderTheme = {
  colors: {background: string; text: string};
};

const useSafeInsets = (): EdgeInsets => {
  const contextInsets = React.useContext(SafeAreaInsetsContext);
  return (
    contextInsets ||
    initialWindowMetrics?.insets || {top: 0, bottom: 0, left: 0, right: 0}
  );
};

export const useContentPaddingBottom = (): number => {
  const insets = useSafeInsets();

  return Platform.OS === 'android' ? insets.bottom : 0;
};

export const createStackScreenOptions = (
  theme: HeaderTheme,
  paddingBottom: number,
) =>
  ({
    ...baseNavigatorOptions,
    headerTransparent: false,
    headerStyle: {backgroundColor: theme.colors.background},
    headerShadowVisible: false,
    headerTintColor: theme.colors.text,
    headerTitleAlign: 'center' as const,
    contentStyle: {paddingBottom},
    header: (props: any) => <CustomHeader {...props} />,
  } as const);

export const useStackScreenOptions = (theme: HeaderTheme) => {
  const paddingBottom = useContentPaddingBottom();

  return createStackScreenOptions(theme, paddingBottom);
};
