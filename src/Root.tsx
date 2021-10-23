import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createStackNavigator, TransitionPresets} from '@react-navigation/stack';
import {RootState} from './store';
import {AppEffects} from './store/app';
import navTheme from './theme';

import SplashScreen from './navigation/app/screens/Splash';
import OnboardingStack, {
  OnboardingStackParamList,
} from './navigation/onboarding/OnboardingStack';
import TabsStack from './navigation/tabs/TabsStack';
import BitpayIdStack, {
  BitpayIdStackParamList,
} from './navigation/bitpay-id/BitpayIdStack';

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
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );
  const appIsLoading = useSelector(({APP}: RootState) => APP.appIsLoading);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(AppEffects.startAppInit());
  }, [dispatch]);

  if (appIsLoading) {
    return <SplashScreen />;
  }

  const initialRoute = onboardingCompleted
    ? RootStacks.TABS
    : RootStacks.ONBOARDING;

  const Root = createStackNavigator<RootStackParamList>();
  const baseOptions = {
    ...TransitionPresets.SlideFromRightIOS,
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Root.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute}>
        <Root.Screen
          name={RootStacks.ONBOARDING}
          component={OnboardingStack}
          options={{...baseOptions}}
        />
        <Root.Screen
          name={RootStacks.TABS}
          component={TabsStack}
          options={{...baseOptions}}
        />
        <Root.Screen
          name={RootStacks.BITPAY_ID}
          component={BitpayIdStack}
          options={{...baseOptions}}
        />
      </Root.Navigator>
    </NavigationContainer>
  );
};
