import React from 'react';
import {SafeAreaView} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {OnboardingStackParamList} from '../OnboardingStack';
import styled from 'styled-components/native';
type Props = StackScreenProps<OnboardingStackParamList, 'OnboardingStart'>;
import Button from '../../../components/button/Button';

const Login = styled.View`
  align-items: flex-end;
`;

const LoginButtonContainer = styled.View`
  width: 30%;
  margin: 10px;
`;

const OnboardingStart = ({navigation}: Props) => {
  return (
    <SafeAreaView>
      <Login>
        <LoginButtonContainer>
          <Button buttonType={'pill'}>Log In</Button>
        </LoginButtonContainer>
      </Login>
    </SafeAreaView>
  );
};

export default OnboardingStart;
