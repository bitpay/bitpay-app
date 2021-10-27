import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
  headerRightContainerStyle,
} from '../../constants/navigation-options';
import {useNavigation} from '@react-navigation/native';
import Button from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import OnboardingStartScreen from './screens/OnboardingStart';
import PinScreen from './screens/Pin';
import CreateWallet from './screens/CreateWallet';
import TermsOfUse from './screens/TermsOfUse';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
  Pin: undefined;
  CreateWallet: undefined;
  TermsOfUse: {
    context?: 'skip' | undefined;
  };
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
  PIN = 'Pin',
  CREATE_WALLET = 'CreateWallet',
  TERMS_OF_USE = 'TermsOfUse',
}

const Onboarding = createStackNavigator<OnboardingStackParamList>();

const OnboardingStack = () => {
  const navigation = useNavigation();

  return (
    <Onboarding.Navigator
      screenOptions={{
        ...baseNavigatorOptions,
      }}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        options={{
          ...baseScreenOptions,
          headerRightContainerStyle,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('BitpayId', {
                  screen: 'LoginSignup',
                  params: {context: 'login'},
                });
              }}>
              Log In
            </Button>
          ),
        }}
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
      <Onboarding.Screen
        options={{
          ...baseScreenOptions,
          headerRightContainerStyle,
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Onboarding', {
                  screen: 'CreateWallet',
                });
              }}>
              Skip
            </Button>
          ),
        }}
        name={OnboardingScreens.PIN}
        component={PinScreen}
      />
      <Onboarding.Screen
        options={{
          ...baseScreenOptions,
          headerRightContainerStyle,
          gestureEnabled: false,
          headerLeft: () => null,
          headerRight: () => (
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Onboarding', {
                  screen: 'TermsOfUse',
                  params: {
                    context: 'skip',
                  },
                });
              }}>
              Skip
            </Button>
          ),
        }}
        name={OnboardingScreens.CREATE_WALLET}
        component={CreateWallet}
      />
      <Onboarding.Screen
        options={{
          ...baseScreenOptions,
          headerRightContainerStyle,
          gestureEnabled: false,
          headerRight: () => null,
        }}
        name={OnboardingScreens.TERMS_OF_USE}
        component={TermsOfUse}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
