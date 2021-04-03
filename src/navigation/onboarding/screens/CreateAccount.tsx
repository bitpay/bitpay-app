import React from 'react';
import {Text, View} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {OnboardingStackParamList} from '../OnboardingStack';

type CreateAccountScreenRouteProp = RouteProp<
  OnboardingStackParamList,
  'CreateAccount'
>;

type CreateAccountScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'CreateAccount'
>;

type Props = {
  route: CreateAccountScreenRouteProp;
  navigation: CreateAccountScreenNavigationProp;
};

const CreateAccountScreen = ({}: Props) => {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Create Account</Text>
    </View>
  );
};

export default CreateAccountScreen;
