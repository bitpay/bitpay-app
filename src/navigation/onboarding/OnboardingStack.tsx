import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import OnboardingStartScreen from './screens/OnboardingStart';
import LoginSignup from './screens/Login-Signup';

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
      screenOptions={{
        header: () => null,
      }}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        name={OnboardingScreens.LOGIN_SIGNUP}
        component={LoginSignup}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
