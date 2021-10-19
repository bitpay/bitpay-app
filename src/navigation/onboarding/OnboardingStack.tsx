import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import OnboardingStartScreen from './screens/OnboardingStart';
import LoginSignup from './screens/LoginSignup';
import {TransitionPresets} from '@react-navigation/stack';
import {screenOptions} from '../../constants/navigation-options';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
  LoginSignup: {context: 'login' | 'signup'};
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  LOGIN_SIGNUP = 'LoginSignup',
}

const Onboarding = createStackNavigator<OnboardingStackParamList>();

const OnboardingStack = () => {
  return (
    <Onboarding.Navigator
      screenOptions={screenOptions}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.LOGIN_SIGNUP}
        component={LoginSignup}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
