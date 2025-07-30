import React from 'react';
import {Platform} from 'react-native';
import {
  SafeAreaInsetsContext,
  initialWindowMetrics,
  EdgeInsets,
} from 'react-native-safe-area-context';
import {useAppSelector} from '../../utils/hooks';
import CustomHeader, {
  headerHeight,
} from '../../components/navigation/CustomHeader';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';

export const useHeaderPaddingTop = (): number => {
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  // Get insets from provider, bootstrap metrics, or fall back to zero.
  const contextInsets = React.useContext(SafeAreaInsetsContext);
  const insets: EdgeInsets = contextInsets ||
    initialWindowMetrics?.insets || {top: 0, bottom: 0, left: 0, right: 0};

  return Platform.OS === 'android' && !showArchaxBanner
    ? headerHeight + (insets.top ?? 0)
    : headerHeight;
};

export const useStackScreenOptions = (theme: {
  colors: {background: string; text: string};
}) => {
  const paddingTop = useHeaderPaddingTop();

  return {
    ...baseNavigatorOptions,
    headerTransparent: true,
    headerStyle: {backgroundColor: theme.colors.background},
    headerShadowVisible: false,
    headerTintColor: theme.colors.text,
    headerTitleAlign: 'center' as const,
    contentStyle: {paddingTop},
    header: (props: any) => <CustomHeader {...props} />,
  };
};
