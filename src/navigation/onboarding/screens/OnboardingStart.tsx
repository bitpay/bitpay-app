import React from 'react';
import {Button, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const OnboardingStart = () => {
  const navigation = useNavigation();

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Onboarding Start</Text>
      <Button
        title="Create Account"
        onPress={() =>
          navigation.navigate('BitpayId', {
            screen: 'LoginSignup',
            params: {context: 'signup'},
          })
        }
      />
      <Button
        title="Login"
        onPress={() =>
          navigation.navigate('BitpayId', {
            screen: 'LoginSignup',
            params: {context: 'login'},
          })
        }
      />
    </View>
  );
};

export default OnboardingStart;
