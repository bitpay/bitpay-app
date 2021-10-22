import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import OnboardingStartScreen from './screens/OnboardingStart';
import {screenOptions} from '../../constants/navigation-options';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
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
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
