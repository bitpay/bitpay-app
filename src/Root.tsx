import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import debounce from 'lodash.debounce';
import React, {useEffect, useState} from 'react';
import {Appearance, AppState, AppStateStatus, StatusBar} from 'react-native';
import RNBootSplash from 'react-native-bootsplash';
import 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import {baseScreenOptions} from './constants/NavigationOptions';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from './store';
import {AppEffects, AppActions} from './store/app';
import {BitPayDarkTheme, BitPayLightTheme} from './themes/bitpay';
import {LogActions} from './store/log';
import {useDeeplinks} from './utils/hooks';

import BitpayIdStack, {
  BitpayIdStackParamList,
} from './navigation/bitpay-id/BitpayIdStack';
import OnboardingStack, {
  OnboardingStackParamList,
} from './navigation/onboarding/OnboardingStack';
import TabsStack, {TabsStackParamList} from './navigation/tabs/TabsStack';
import WalletStack, {
  WalletStackParamList,
} from './navigation/wallet/WalletStack';
import CameraStack, {
  CameraStackParamList,
} from './navigation/camera/CameraStack';
import GeneralSettingsStack, {
  GeneralSettingsStackParamList,
} from './navigation/tabs/settings/general/GeneralStack';
import SecuritySettingsStack, {
  SecuritySettingsStackParamList,
} from './navigation/tabs/settings/security/SecurityStack';
import ContactSettingsStack, {
  ContactSettingsStackParamList,
} from './navigation/tabs/settings/contacts/ContactsStack';
import NotificationSettingsStack, {
  NotificationSettingsStackParamList,
} from './navigation/tabs/settings/notifications/NotificationsStack';
import AboutStack, {
  AboutStackParamList,
} from './navigation/tabs/settings/about/AboutStack';

// ROOT NAVIGATION CONFIG
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Tabs: NavigatorScreenParams<TabsStackParamList>;
  BitpayId: NavigatorScreenParams<BitpayIdStackParamList>;
  Wallet: NavigatorScreenParams<WalletStackParamList>;
  Camera: NavigatorScreenParams<CameraStackParamList>;
  GeneralSettings: NavigatorScreenParams<GeneralSettingsStackParamList>;
  SecuritySettings: NavigatorScreenParams<SecuritySettingsStackParamList>;
  ContactSettings: NavigatorScreenParams<ContactSettingsStackParamList>;
  NotificationSettings: NavigatorScreenParams<NotificationSettingsStackParamList>;
  About: NavigatorScreenParams<AboutStackParamList>;
};
// ROOT NAVIGATION CONFIG
export enum RootStacks {
  ONBOARDING = 'Onboarding',
  TABS = 'Tabs',
  BITPAY_ID = 'BitpayId',
  WALLET = 'Wallet',
  CAMERA = 'Camera',
  // SETTINGS
  GENERAL_SETTINGS = 'GeneralSettings',
  SECURITY_SETTINGS = 'SecuritySettings',
  CONTACT_SETTINGS = 'ContactSettings',
  NOTIFICATION_SETTINGS = 'NotificationSettings',
  ABOUT = 'About',
}
// ROOT NAVIGATION CONFIG
export type NavScreenParams = NavigatorScreenParams<
  OnboardingStackParamList &
    BitpayIdStackParamList &
    WalletStackParamList &
    CameraStackParamList &
    GeneralSettingsStackParamList &
    SecuritySettingsStackParamList &
    ContactSettingsStackParamList &
    NotificationSettingsStackParamList &
    AboutStackParamList
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
  const linking = useDeeplinks();
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
  StatusBar.setBarStyle(
    scheme === 'light' ? 'dark-content' : 'light-content',
    true,
  );

  // ROOT STACKS AND GLOBAL COMPONENTS
  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : RootStacks.ONBOARDING;

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={theme}
        linking={linking}
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
            ...baseScreenOptions,
            headerShown: false,
          }}
          initialRouteName={initialRoute}>
          <Root.Screen
            name={RootStacks.ONBOARDING}
            component={OnboardingStack}
          />
          <Root.Screen
            name={RootStacks.TABS}
            component={TabsStack}
            options={{
              gestureEnabled: false,
            }}
          />
          <Root.Screen name={RootStacks.BITPAY_ID} component={BitpayIdStack} />
          <Root.Screen name={RootStacks.WALLET} component={WalletStack} />
          <Root.Screen
            name={RootStacks.CAMERA}
            component={CameraStack}
            options={{...baseScreenOptions}}
          />
          {/* SETTINGS */}
          <Root.Screen
            name={RootStacks.GENERAL_SETTINGS}
            component={GeneralSettingsStack}
          />
          <Root.Screen
            name={RootStacks.SECURITY_SETTINGS}
            component={SecuritySettingsStack}
          />
          <Root.Screen
            name={RootStacks.CONTACT_SETTINGS}
            component={ContactSettingsStack}
          />
          <Root.Screen
            name={RootStacks.NOTIFICATION_SETTINGS}
            component={NotificationSettingsStack}
          />
          <Root.Screen name={RootStacks.ABOUT} component={AboutStack} />
        </Root.Navigator>
      </NavigationContainer>
      <OnGoingProcessModal />
      <BottomNotificationModal />
    </SafeAreaProvider>
  );
};
