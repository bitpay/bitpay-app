import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {Appearance, AppState, AppStateStatus, StatusBar} from 'react-native';
import 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import {baseScreenOptions} from './constants/NavigationOptions';
import RNBootSplash from 'react-native-bootsplash';
import BitpayIdStack, {
  BitpayIdStackParamList,
} from './navigation/bitpay-id/BitpayIdStack';
import OnboardingStack, {
  OnboardingStackParamList,
} from './navigation/onboarding/OnboardingStack';
import WalletStack, {
  WalletStackParamList,
} from './navigation/wallet/WalletStack';
import TabsStack from './navigation/tabs/TabsStack';
import {RootState} from './store';
import {AppEffects, AppActions} from './store/app';
import {BitPayDarkTheme, BitPayLightTheme} from './themes/bitpay';
import debounce from 'lodash.debounce';
import {LogActions} from './store/log';

// ROOT NAVIGATION CONFIG
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Tabs: undefined;
  BitpayId: NavigatorScreenParams<BitpayIdStackParamList>;
  Wallet: NavigatorScreenParams<WalletStackParamList>;
};
// ROOT NAVIGATION CONFIG
export enum RootStacks {
  ONBOARDING = 'Onboarding',
  TABS = 'Tabs',
  BITPAY_ID = 'BitpayId',
  WALLET = 'Wallet',
}
// ROOT NAVIGATION CONFIG
export type NavScreenParams = NavigatorScreenParams<
  OnboardingStackParamList & BitpayIdStackParamList & WalletStackParamList
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
export const navigate = (
  name: keyof RootStackParamList,
  params: NavScreenParams,
) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

const Root = createStackNavigator<RootStackParamList>();

export default () => {
  const dispatch = useDispatch();
  const [, rerender] = useState({});
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );
  const appIsLoading = useSelector(({APP}: RootState) => APP.appIsLoading);
  const appColorScheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const currentRoute = useSelector(({APP}: RootState) => APP.currentRoute);

  // SPLASH SCREEN
  useEffect(() => {
    if (!appIsLoading) {
      RNBootSplash.hide({fade: true});
    }
  }, [appIsLoading]);

  // MAIN APP INIT
  useEffect(() => {
    dispatch(AppEffects.startAppInit());
  }, [dispatch]);

  // THEME
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

  // ROOT STACKS AND GLOBAL COMPONENTS
  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : RootStacks.ONBOARDING;

  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" />
      <NavigationContainer
        ref={navigationRef}
        theme={theme}
        onReady={() => {
          // routing to previous route if onboarding
          if (currentRoute && !onboardingCompleted) {
            const [currentStack, params] = currentRoute;
            navigationRef.navigate(currentStack, params);
            dispatch(
              LogActions.info(
                `Navigating to cached route... ${currentStack} ${JSON.stringify(
                  params,
                )}`,
              ),
            );
          }
        }}
        onStateChange={debounce(navEvent => {
          // storing current route
          if (navEvent) {
            const {routes} = navEvent;
            const {name, params} = navEvent.routes[routes.length - 1];
            dispatch(AppActions.setCurrentRoute([name, params]));
            dispatch(
              LogActions.info(
                `Navigation event... ${name} ${JSON.stringify(params)}`,
              ),
            );
          }
        }, 300)}>
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
          <Root.Screen
            name={RootStacks.WALLET}
            component={WalletStack}
            options={{...baseScreenOptions}}
          />
        </Root.Navigator>
      </NavigationContainer>
      <OnGoingProcessModal />
      <BottomNotificationModal />
    </SafeAreaProvider>
  );
};
