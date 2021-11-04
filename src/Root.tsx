import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import { Appearance, StatusBar } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import { baseScreenOptions } from './constants/NavigationOptions';
import SplashScreen from './navigation/app/screens/Splash';
import BitpayIdStack, { BitpayIdStackParamList } from './navigation/bitpay-id/BitpayIdStack';
import OnboardingStack, { OnboardingStackParamList } from './navigation/onboarding/OnboardingStack';
import TabsStack from './navigation/tabs/TabsStack';
import { RootState } from './store';
import { AppEffects } from './store/app';
import { BitPayColorSchemeName } from './theme';
import { BitPayDarkTheme, BitPayLightTheme } from './themes/bitpay';

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
  const onboardingCompleted = useSelector(({ APP }: RootState) => APP.onboardingCompleted);
  const appIsLoading = useSelector(({ APP }: RootState) => APP.appIsLoading);
  const appColorScheme = useSelector(({ APP }: RootState) => APP.colorScheme);

  useEffect(() => {
    dispatch(AppEffects.startAppInit());
  }, [dispatch]);

  if (appIsLoading) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  const scheme: BitPayColorSchemeName = appColorScheme === 'system' ? Appearance.getColorScheme() : appColorScheme;
  const theme = scheme === 'dark' ? BitPayDarkTheme : BitPayLightTheme;

  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : RootStacks.ONBOARDING;

  const Root = createStackNavigator<RootStackParamList>();

  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" />
      <NavigationContainer theme={theme}>
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
