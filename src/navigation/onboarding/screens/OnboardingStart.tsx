import React from 'react';
import {Button, SafeAreaView, Text, StatusBar} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const OnboardingStart = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView>
      <StatusBar barStyle="dark-content" />
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
    </SafeAreaView>
  );
};

export default OnboardingStart;
