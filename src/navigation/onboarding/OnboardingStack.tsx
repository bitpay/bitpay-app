import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import OnboardingStartScreen from './screens/OnboardingStart';
import CreateAccount from './screens/CreateAccount';
import Login from './screens/Login';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
  CreateAccount: undefined;
  Login: undefined;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  CREATE_ACCOUNT = 'CreateAccount',
  LOGIN = 'Login',
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
        name={OnboardingScreens.CREATE_ACCOUNT}
        component={CreateAccount}
      />
      <Onboarding.Screen name={OnboardingScreens.LOGIN} component={Login} />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
