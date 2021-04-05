import React from 'react';
import {Text, View} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {OnboardingStackParamList} from '../OnboardingStack';

type Props = StackScreenProps<OnboardingStackParamList, 'CreateAccount'>;

const CreateAccountScreen = ({}: Props) => {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Create Account</Text>
    </View>
  );
};

export default CreateAccountScreen;
