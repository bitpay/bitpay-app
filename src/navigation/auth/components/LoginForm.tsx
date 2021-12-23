import {yupResolver} from '@hookform/resolvers/yup';
import {useTheme} from '@react-navigation/native';
import React from 'react';
import {useForm, Controller} from 'react-hook-form';
import styled from 'styled-components/native';
import * as yup from 'yup';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {BaseText} from '../../../components/styled/Text';
import {SlateDark} from '../../../styles/colors';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthInputContainer,
} from './AuthFormContainer';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginProps {
  context: 'login' | 'signup';
  onSubmit: (credentials: LoginCredentials) => void;
  onTroubleLoggingIn: () => void;
  onAlreadyHaveAccount: () => void;
}

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

const SecondaryActionContainer = styled.View`
  width: 100%;
`;

const Row = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const LoginText = styled(BaseText)`
  color: ${SlateDark};
  font-size: 18px;
`;

const schema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

export const LoginForm: React.FC<LoginProps> = props => {
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});
  const theme = useTheme();
  const {context, onSubmit, onAlreadyHaveAccount, onTroubleLoggingIn} = props;

  const onSubmitPress = handleSubmit(
    (formData: {email: string; password: string}) => {
      const credentials: LoginCredentials = {
        email: formData.email,
        password: formData.password,
      };

      onSubmit(credentials);
    },
  );

  let header: string;
  let secondaryAction: React.ReactElement;

  if (context === 'login') {
    header = 'Welcome back!';
    secondaryAction = (
      <Button
        theme={theme}
        buttonType={'link'}
        onPress={() => onTroubleLoggingIn()}>
        Trouble logging in?
      </Button>
    );
  } else {
    header = 'Create Account';
    secondaryAction = (
      <Row>
        <LoginText>Already have an account?</LoginText>
        <Button
          theme={theme}
          buttonType={'link'}
          onPress={() => onAlreadyHaveAccount()}>
          Log in
        </Button>
      </Row>
    );
  }

  return (
    <AuthFormContainer theme={theme} header={header}>
      <AuthInputContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              theme={theme}
              placeholder={'satoshi@example.com'}
              label={'EMAIL'}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
              error={errors.email?.message}
              value={value}
            />
          )}
          name="email"
          defaultValue=""
        />
      </AuthInputContainer>
      <AuthInputContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              theme={theme}
              placeholder={'strongPassword123'}
              label={'PASSWORD'}
              type={'password'}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
              error={errors.password?.message}
              value={value}
            />
          )}
          name="password"
          defaultValue=""
        />
      </AuthInputContainer>
      <AuthActionsContainer>
        <PrimaryActionContainer>
          <Button onPress={onSubmitPress}>Log In</Button>
        </PrimaryActionContainer>
        <SecondaryActionContainer>{secondaryAction}</SecondaryActionContainer>
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default LoginForm;
