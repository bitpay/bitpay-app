import {yupResolver} from '@hookform/resolvers/yup';
import React from 'react';
import {useForm, Controller} from 'react-hook-form';
import styled from 'styled-components/native';
import * as yup from 'yup';
import {SlateDark} from '../../styles/colors';
import Button from '../button/Button';
import BoxInput from '../form/BoxInput';
import {BaseText} from '../styled/Text';

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

const LoginContainer = styled.SafeAreaView`
  justify-content: center;
  align-items: center;
`;

const HeaderContainer = styled.View`
  width: 100%;
  padding: 0 20px;
  margin: 25px 0;
`;

const HeaderText = styled(BaseText)`
  font-size: 25px;
  font-weight: 700;
  line-height: 34px;
`;

const FormContainer = styled.View`
  width: 100%;
  padding: 0 20px;
`;

const InputContainer = styled.View`
  margin: 15px 0;
`;

const CtaContainer = styled.View`
  margin-top: 20px;
`;

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
      <Button buttonType={'link'} onPress={() => onTroubleLoggingIn()}>
        Trouble logging in?
      </Button>
    );
  } else {
    header = 'Create Account';
    secondaryAction = (
      <Row>
        <LoginText>Already have an account?</LoginText>
        <Button buttonType={'link'} onPress={() => onAlreadyHaveAccount()}>
          Log in
        </Button>
      </Row>
    );
  }

  return (
    <LoginContainer>
      <HeaderContainer>
        <HeaderText>{header}</HeaderText>
      </HeaderContainer>
      <FormContainer>
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
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
        </InputContainer>
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
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
        </InputContainer>
        <CtaContainer>
          <PrimaryActionContainer>
            <Button onPress={onSubmitPress}>Continue</Button>
          </PrimaryActionContainer>
          <SecondaryActionContainer>{secondaryAction}</SecondaryActionContainer>
        </CtaContainer>
      </FormContainer>
    </LoginContainer>
  );
};

export default LoginForm;
