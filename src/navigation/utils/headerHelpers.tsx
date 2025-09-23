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

const useSafeInsets = (): EdgeInsets => {
  const contextInsets = React.useContext(SafeAreaInsetsContext);
  return (
    contextInsets ||
    initialWindowMetrics?.insets || {top: 0, bottom: 0, left: 0, right: 0}
  );
};

export const useContentPaddingTop = (): number => {
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const insets = useSafeInsets();

  return !showArchaxBanner ? headerHeight + (insets.top ?? 0) : headerHeight;
};

export const useContentPaddingBottom = (): number => {
  const insets = useSafeInsets();

  return Platform.OS === 'android' ? insets.bottom : 0;
};

export const useStackScreenOptions = (theme: {
  colors: {background: string; text: string};
}) => {
  const paddingBottom = useContentPaddingBottom();
  const paddingTop = useContentPaddingTop();

  return {
    ...baseNavigatorOptions,
    headerTransparent: true,
    headerStyle: {backgroundColor: theme.colors.background},
    headerShadowVisible: false,
    headerTintColor: theme.colors.text,
    headerTitleAlign: 'center' as const,
    contentStyle: {paddingBottom, paddingTop},
    header: (props: any) => <CustomHeader {...props} />,
  };
};
