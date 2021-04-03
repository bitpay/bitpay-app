import React from 'react';
import {Button, Text, View} from 'react-native';

import {StackNavigationProp} from '@react-navigation/stack';
import {OnboardingScreens, OnboardingStackParamList} from '../OnboardingStack';
import {RouteProp} from '@react-navigation/native';

type OnboardingStartScreenRouteProp = RouteProp<
  OnboardingStackParamList,
  'OnboardingStart'
>;

type OnboardingStartScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'OnboardingStart'
>;

type Props = {
  route: OnboardingStartScreenRouteProp;
  navigation: OnboardingStartScreenNavigationProp;
};

const OnboardingStart = ({navigation}: Props) => {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Onboarding Start</Text>
      <Button
        title="Get Started"
        onPress={() => navigation.navigate(OnboardingScreens.CREATE_ACCOUNT)}
      />
      <Button
        title="Login"
        onPress={() => navigation.navigate(OnboardingScreens.LOGIN)}
      />
    </View>
  );
};

export default OnboardingStart;
