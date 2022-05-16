import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Keyboard, SafeAreaView, TextInput} from 'react-native';
import * as yup from 'yup';
import Button, {ButtonState} from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {Link} from '../../../components/styled/Text';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {navigationRef, RootStacks} from '../../../Root';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthActionText,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import RecaptchaModal, {CaptchaRef} from '../components/RecaptchaModal';

export type LoginScreenParamList =
  | {
      onLoginSuccess?: ((...args: any[]) => any) | undefined;
    }
  | undefined;

type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

const schema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

interface LoginFormFieldValues {
  email: string;
  password: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation, route}) => {
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    getValues,
    formState: {errors},
  } = useForm<LoginFormFieldValues>({resolver: yupResolver(schema)});
  const network = useAppSelector(({APP}) => APP.network);
  const session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const loginStatus = useAppSelector(({BITPAY_ID}) => BITPAY_ID.loginStatus);
  const loginError = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.loginError || '',
  );
  const [isCaptchaModalVisible, setCaptchaModalVisible] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>(null);
  const passwordRef = useRef<TextInput>(null);
  const captchaRef = useRef<CaptchaRef>(null);
  const {onLoginSuccess} = route.params || {};

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      dispatch(BitPayIdActions.completedPairing());

      if (onLoginSuccess) {
        onLoginSuccess();
        dispatch(BitPayIdActions.updateLoginStatus(null));
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

      dispatch(BitPayIdActions.updateLoginStatus(null));
      return;
    }

    if (loginStatus === 'failed') {
      captchaRef.current?.reset();
      setButtonState('failed');

      const done = () => {
        setButtonState(null);
        dispatch(BitPayIdActions.updateLoginStatus(null));
      };

      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: 'Login failed',
          message:
            loginError ||
            'Could not log in. Please review your information and try again.',
          enableBackdropDismiss: true,
          onBackdropDismiss: done,
          actions: [
            {
              text: 'OK',
              action: done,
            },
          ],
        }),
      );
      return;
    }

    if (loginStatus === 'twoFactorPending') {
      setButtonState(null);
      navigation.navigate('TwoFactorAuthentication');
      return;
    }

    if (loginStatus === 'emailAuthenticationPending') {
      setButtonState(null);
      navigation.navigate('EmailAuthentication');
      return;
    }
  }, [dispatch, onLoginSuccess, navigation, loginStatus, loginError]);

  const onSubmit = handleSubmit(({email, password}) => {
    Keyboard.dismiss();
    if (session.captchaDisabled) {
      setButtonState('loading');
      dispatch(BitPayIdEffects.startLogin({email, password}));
    } else {
      setCaptchaModalVisible(true);
    }
  });

  const onTroubleLoggingIn = () => {
    navigation.navigate('ForgotPassword');
  };

  const onCaptchaResponse = async (gCaptchaResponse: string) => {
    const {email, password} = getValues();
    setCaptchaModalVisible(false);
    setButtonState('loading');
    await sleep(500);
    dispatch(BitPayIdEffects.startLogin({email, password, gCaptchaResponse}));
  };

  const onCaptchaCancel = () => {
    haptic('notificationWarning');
    setCaptchaModalVisible(false);
  };

  return (
    <SafeAreaView>
      <AuthFormContainer>
        <AuthRowContainer>
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
                keyboardType={'email-address'}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            )}
            name="email"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                ref={passwordRef}
                placeholder={'strongPassword123'}
                label={'PASSWORD'}
                type={'password'}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.password?.message}
                value={value}
                onSubmitEditing={onSubmit}
              />
            )}
            name="password"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <AuthActionRow>
            <Button onPress={onSubmit} state={buttonState}>
              Log In
            </Button>
          </AuthActionRow>

          <AuthActionRow>
            <AuthActionText>
              Don't have an account?{' '}
              <Link
                onPress={() => {
                  navigation.navigate('CreateAccount');
                }}>
                Create Account
              </Link>
            </AuthActionText>
          </AuthActionRow>

          <AuthActionRow>
            <AuthActionText>
              <Link onPress={() => onTroubleLoggingIn()}>
                Trouble logging in?
              </Link>
            </AuthActionText>
          </AuthActionRow>
        </AuthActionsContainer>

        <RecaptchaModal
          isVisible={isCaptchaModalVisible}
          ref={captchaRef}
          sitekey={session.noCaptchaKey}
          baseUrl={BASE_BITPAY_URLS[network]}
          onResponse={onCaptchaResponse}
          onCancel={onCaptchaCancel}
        />
      </AuthFormContainer>
    </SafeAreaView>
  );
};

export default LoginScreen;
