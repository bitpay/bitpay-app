import React from 'react';
import {Button, Text, View} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {OnboardingStackParamList} from '../OnboardingStack';
import {useDispatch} from 'react-redux';
import {AuthActions} from '../../../store/auth/auth.actions';

type LoginScreenRouteProp = RouteProp<OnboardingStackParamList, 'Login'>;

type LoginScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'Login'
>;

type Props = {
  route: LoginScreenRouteProp;
  navigation: LoginScreenNavigationProp;
};

const LoginScreen = ({route, navigation}: Props) => {
  console.log(route);
  const dispatch = useDispatch();

  const login = () => {
    dispatch(
      AuthActions.successCreateAccount({
        email: 'jwhite@bitpay.com',
        isVerified: true,
      }),
    );
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Login</Text>
      <Button title="login" onPress={login} />
    </View>
  );
};

export default LoginScreen;
