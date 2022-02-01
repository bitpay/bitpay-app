import {yupResolver} from '@hookform/resolvers/yup';
import {useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import * as yup from 'yup';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {BaseText} from '../../../components/styled/Text';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {LoginStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {SlateDark} from '../../../styles/colors';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthInputContainer,
} from '../components/AuthFormContainer';

export type LoginSignupParamList = {
  context: 'login' | 'signup';
};

type LoginSignupScreenProps = StackScreenProps<
  AuthStackParamList,
  'LoginSignup'
>;

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

interface LoginFormFieldValues {
  email: string;
  password: string;
}

const LoginSignup: React.FC<LoginSignupScreenProps> = ({navigation, route}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<LoginFormFieldValues>({resolver: yupResolver(schema)});
  const loginStatus = useSelector<RootState, LoginStatus>(
    ({BITPAY_ID}) => BITPAY_ID.loginStatus,
  );
  const {context} = route.params;

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      dispatch(BitPayIdActions.completedPairing());

      const parentNav = navigation.getParent();

      if (parentNav?.canGoBack()) {
        parentNav.goBack();
      } else {
        navigationRef.navigate(RootStacks.BITPAY_ID, {
          screen: BitpayIdScreens.PROFILE,
        });
      }

      return;
    }

    if (loginStatus === 'failed') {
      console.log('oh man login failed');
      return;
    }

    if (loginStatus === 'twoFactorPending') {
      navigation.navigate('TwoFactorAuthentication');
      return;
    }

    if (loginStatus === 'emailAuthenticationPending') {
      navigation.navigate('EmailAuthentication');
      return;
    }
  }, [loginStatus, navigation, dispatch]);

  const onSubmit = handleSubmit(({email, password}) => {
    dispatch(BitPayIdEffects.startLogin({email, password}));
  });

  const onAlreadyHaveAccount = () => {
    navigation.setParams({context: 'login'});
  };

  const onTroubleLoggingIn = () => {
    console.log('trouble logging in');
  };

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
          <Button onPress={onSubmit}>Log In</Button>
        </PrimaryActionContainer>
        <SecondaryActionContainer>{secondaryAction}</SecondaryActionContainer>
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default LoginSignup;
