import React from 'react';
import {createStackNavigator, TransitionPresets} from '@react-navigation/stack';
import {headerRightContainerStyle, screenOptions} from '../../constants/navigation-options';
import {useNavigation} from '@react-navigation/native';
import Button from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import OnboardingStartScreen from './screens/OnboardingStart';
import PinScreen from './screens/Pin';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
  Pin: undefined;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  PIN = 'Pin',
}

const Onboarding = createStackNavigator<OnboardingStackParamList>();

const OnboardingStack = () => {
  const navigation = useNavigation();
  const login = () => {
    haptic('impactLight');
    navigation.navigate('BitpayId', {
      screen: 'LoginSignup',
      params: {context: 'login'},
    });
  };

  // const continueWithoutAccount = () => {
  //   haptic('impactLight');
  //   navigation.navigate('Onboarding', {
  //     screen: 'Pin',
  //   });
  // };

  return (
    <Onboarding.Navigator
      screenOptions={{
        ...screenOptions,
      }}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          headerRight: () => (
            <Button buttonType={'pill'} onPress={login}>
              Log In
            </Button>
          ),
          ...TransitionPresets.SlideFromRightIOS,
        }}
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        options={{
          headerRightContainerStyle,
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <Button buttonType={'pill'} onPress={undefined}>
              Skip
            </Button>
          ),
          ...TransitionPresets.SlideFromRightIOS,
        }}
        name={OnboardingScreens.PIN}
        component={PinScreen}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
