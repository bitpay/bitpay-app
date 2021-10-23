import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import OnboardingStartScreen from './screens/OnboardingStart';
import {screenOptions} from '../../constants/navigation-options';
import Button from '../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../components/haptic-feedback/haptic';

export type OnboardingStackParamList = {
  OnboardingStart: undefined;
};

export enum OnboardingScreens {
  ONBOARDING_START = 'OnboardingStart',
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

  return (
    <Onboarding.Navigator
      screenOptions={{
        ...screenOptions,
      }}
      initialRouteName="OnboardingStart">
      <Onboarding.Screen
        options={{
          headerRightContainerStyle: {paddingHorizontal: 10},
          headerRight: () => (
            <Button buttonType={'pill'} onPress={login}>
              Log In
            </Button>
          ),
        }}
        name={OnboardingScreens.ONBOARDING_START}
        component={OnboardingStartScreen}
      />
    </Onboarding.Navigator>
  );
};

export default OnboardingStack;
