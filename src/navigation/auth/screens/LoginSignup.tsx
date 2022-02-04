import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import * as yup from 'yup';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {BaseText} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {Session} from '../../../store/bitpay-id/bitpay-id.models';
import {LoginStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthInputContainer,
} from '../components/AuthFormContainer';
import RecaptchaModal, {CaptchaRef} from '../components/RecaptchaModal';

export type LoginSignupParamList = {
  context: 'login' | 'signup';
  onLoginSuccess?: ((...args: any[]) => any) | undefined;
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
  color: ${({theme}) => theme.colors.description};
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
  const {
    control,
    handleSubmit,
    getValues,
    formState: {errors},
  } = useForm<LoginFormFieldValues>({resolver: yupResolver(schema)});
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const session = useSelector<RootState, Session>(
    ({BITPAY_ID}) => BITPAY_ID.session,
  );
  const loginStatus = useSelector<RootState, LoginStatus>(
    ({BITPAY_ID}) => BITPAY_ID.loginStatus,
  );
  const [isCaptchaModalVisible, setCaptchaModalVisible] = useState(false);
  const captchaRef = useRef<CaptchaRef>(null);
  const {context, onLoginSuccess} = route.params;

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      dispatch(BitPayIdActions.completedPairing());

      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }

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
      // TODO
      captchaRef.current?.reset();
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
  }, [loginStatus, navigation, dispatch, onLoginSuccess]);

  const onSubmit = handleSubmit(({email, password}) => {
    if (session.captchaDisabled) {
      dispatch(BitPayIdEffects.startLogin({email, password}));
    } else {
      setCaptchaModalVisible(true);
    }
  });

  const onAlreadyHaveAccount = () => {
    navigation.setParams({context: 'login'});
  };

  const onTroubleLoggingIn = () => {
    // TODO
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

  const onCaptchaSubmit = (gCaptchaResponse: string) => {
    const {email, password} = getValues();

    setCaptchaModalVisible(false);
    dispatch(BitPayIdEffects.startLogin({email, password, gCaptchaResponse}));
  };

  const onCaptchaCancel = () => {
    setCaptchaModalVisible(false);
    captchaRef.current?.reset();
  };

  return (
    <AuthFormContainer header={header}>
      <AuthInputContainer>
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
      </AuthInputContainer>

      <AuthInputContainer>
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
      </AuthInputContainer>

      <AuthActionsContainer>
        <PrimaryActionContainer>
          <Button onPress={onSubmit}>Log In</Button>
        </PrimaryActionContainer>
        <SecondaryActionContainer>{secondaryAction}</SecondaryActionContainer>
      </AuthActionsContainer>

      <RecaptchaModal
        isVisible={isCaptchaModalVisible}
        ref={captchaRef}
        sitekey={session.noCaptchaKey}
        baseUrl={BASE_BITPAY_URLS[network]}
        onSubmit={onCaptchaSubmit}
        onCancel={onCaptchaCancel}
      />
    </AuthFormContainer>
  );
};

export default LoginSignup;
