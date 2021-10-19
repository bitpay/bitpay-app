import React from 'react';
import Button from '../../../components/button/Button';
import {StackScreenProps} from '@react-navigation/stack';
import {OnboardingScreens, OnboardingStackParamList} from '../OnboardingStack';
import {useDispatch} from 'react-redux';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import styled from 'styled-components/native';
import BaseText from '../../../components/base-text/BaseText';
import {useForm, Controller} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {SlateDark} from '../../../styles/colors';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';

type Props = StackScreenProps<OnboardingStackParamList, 'LoginSignup'>;

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

const LoginScreen = ({navigation, route}: Props) => {
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const dispatch = useDispatch();

  const onSubmit = (formData: {email: string; password: string}) => {
    const action =
      context === 'login'
        ? BitPayIdEffects.startLogin(formData)
        : BitPayIdEffects.startCreateAccount(formData);
    dispatch(action);
  };

  const {context} = route.params;
  const headerText = context === 'login' ? 'Welcome back!' : 'Create Account';

  return (
    <LoginContainer>
      <HeaderContainer>
        <HeaderText>{headerText}</HeaderText>
      </HeaderContainer>
      <FormContainer>
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'satoshi@nakamoto.com'}
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
            <Button onPress={handleSubmit(onSubmit)}>Continue</Button>
          </PrimaryActionContainer>
          <SecondaryActionContainer>
            {context === 'login' ? (
              <>
                <Button buttonType={'link'} onPress={handleSubmit(onSubmit)}>
                  Trouble logging in?
                </Button>
              </>
            ) : (
              <>
                <Row>
                  <LoginText>Already have an account?</LoginText>
                  <Button
                    buttonType={'link'}
                    onPress={() =>
                      // TODO fix react navigation 6.* ts issue for replace
                      // @ts-ignore
                      navigation.replace(OnboardingScreens.LOGIN_SIGNUP, {
                        context: 'login',
                      })
                    }>
                    Log in
                  </Button>
                </Row>
              </>
            )}
          </SecondaryActionContainer>
        </CtaContainer>
      </FormContainer>
    </LoginContainer>
  );
};

export default LoginScreen;
