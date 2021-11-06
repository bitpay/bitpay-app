import 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from './store';
import {AppEffects} from './store/app';

import navTheme from './theme';
import {baseScreenOptions} from './constants/NavigationOptions';
import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import SplashScreen from './navigation/app/screens/Splash';
import OnboardingStack, {
  OnboardingStackParamList,
} from './navigation/onboarding/OnboardingStack';
import TabsStack from './navigation/tabs/TabsStack';
import BitpayIdStack, {
  BitpayIdStackParamList,
} from './navigation/bitpay-id/BitpayIdStack';

import OnGoingProcessModal from './components/modal/ongoing-process/OngoingProcess';
import BottomNotificationModal from './components/modal/bottom-notification/BottomNotification';
import {StatusBar} from 'react-native';

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

// Used for navigation within effects as the useNavigation hook is only allowed within components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
export const navigate = (
  name: keyof RootStackParamList,
  params: NavigatorScreenParams<
    OnboardingStackParamList & BitpayIdStackParamList
  >,
) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

export default () => {
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );
  const appIsLoading = useSelector(({APP}: RootState) => APP.appIsLoading);

  const dispatch = useDispatch();

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

  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : RootStacks.ONBOARDING;

  const Root = createStackNavigator<RootStackParamList>();

  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
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
