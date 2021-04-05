import React from 'react';
import {Button, Text, View} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {OnboardingStackParamList} from '../OnboardingStack';
import {useDispatch} from 'react-redux';
import {AuthActions} from '../../../store/auth/auth.actions';

type Props = StackScreenProps<OnboardingStackParamList, 'Login'>;

const LoginScreen = ({route}: Props) => {
  console.log(route);
  const dispatch = useDispatch();
  const login = () => dispatch(AuthActions.startLogin());

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Login</Text>
      <Button title="login" onPress={login} />
    </View>
  );
};

export default LoginScreen;
