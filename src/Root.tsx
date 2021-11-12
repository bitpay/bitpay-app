import {
  LinkingOptions,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {Appearance, AppState, AppStateStatus, Linking, StatusBar} from 'react-native';
import 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import { DEEPLINK_PREFIX } from './constants/config';
import {baseScreenOptions} from './constants/NavigationOptions';
import RNBootSplash from 'react-native-bootsplash';
import BitpayIdStack, {
  BitpayIdScreens,
  BitpayIdStackParamList,
} from './navigation/bitpay-id/BitpayIdStack';
import OnboardingStack, {
  OnboardingStackParamList,
} from './navigation/onboarding/OnboardingStack';
import TabsStack from './navigation/tabs/TabsStack';
import {RootState} from './store';
import {AppEffects} from './store/app';
import { LogActions } from './store/log';
import {BitPayDarkTheme, BitPayLightTheme} from './themes/bitpay';

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Tabs: undefined;
  BitpayId: NavigatorScreenParams<BitpayIdStackParamList>;
};

export enum RootStacks {
  ONBOARDING = 'Onboarding',
  TABS = 'Tabs',
  BITPAY_ID = 'BitpayId',
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default () => {
  const dispatch = useDispatch();
  const [, rerender] = useState({});
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );
  const appIsLoading = useSelector(({APP}: RootState) => APP.appIsLoading);
  const appColorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

  useEffect(() => {
    if (!appIsLoading) {
      RNBootSplash.hide({fade: true});
    }
  }, [appIsLoading]);

  useEffect(() => {
    dispatch(AppEffects.startAppInit());
  }, [dispatch]);

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      // status === 'active' when the app goes from background to foreground,
      // if no app scheme set, rerender in case the system theme has changed
      if (status === 'active' && !appColorScheme) {
        rerender({});
      }
    }

    AppState.addEventListener('change', onAppStateChange);

    return () => AppState.removeEventListener('change', onAppStateChange);
  }, [rerender, appColorScheme]);

  const scheme = appColorScheme || Appearance.getColorScheme();
  const theme = scheme === 'dark' ? BitPayDarkTheme : BitPayLightTheme;

  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : RootStacks.ONBOARDING;

  const Root = createStackNavigator<RootStackParamList>();

  Linking.addEventListener('url', ({ url }) => {
    if (url && url.startsWith(`${DEEPLINK_PREFIX}://`)) {
      dispatch(LogActions.info(`Deep link received: ${url}`));
    }
  });

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [
      `${DEEPLINK_PREFIX}://`
    ],
    config: {
      // configuration for associating screens with paths
      screens: {
        [RootStacks.BITPAY_ID]: {
          screens: {
            [BitpayIdScreens.PAIR]: 'wallet-card/pairing'
          }
        }
      }
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" />
      <NavigationContainer theme={theme} linking={linking}>
        <Root.Navigator
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName={initialRoute}>
          <Root.Screen
            name={RootStacks.ONBOARDING}
            component={OnboardingStack}
            options={{...baseScreenOptions}}
          />
          <Root.Screen
            name={RootStacks.TABS}
            component={TabsStack}
            options={{
              ...baseScreenOptions,
              gestureEnabled: false,
            }}
          />
          <Root.Screen
            name={RootStacks.BITPAY_ID}
            component={BitpayIdStack}
            options={{...baseScreenOptions}}
          />
        </Root.Navigator>
      </NavigationContainer>
      <OnGoingProcessModal />
      <BottomNotificationModal />
    </SafeAreaProvider>
  );
};
