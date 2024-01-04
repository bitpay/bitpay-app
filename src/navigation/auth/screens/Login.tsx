import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from 'react-navigation/native-stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Keyboard, SafeAreaView, TextInput} from 'react-native';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {Link} from '../../../components/styled/Text';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import yup from '../../../lib/yup';
import {navigationRef, RootStacks} from '../../../Root';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {AuthScreens, AuthGroupParamList} from '../AuthGroup';
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

type LoginScreenProps = NativeStackScreenProps<
  AuthGroupParamList,
  AuthScreens.LOGIN
>;

const schema = yup.object().shape({
  email: yup.string().email().required().trim(),
  password: yup.string().required(),
});

interface LoginFormFieldValues {
  email: string;
  password: string;
}

const LoginScreen: React.VFC<LoginScreenProps> = ({navigation, route}) => {
  const {t} = useTranslation();
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
        navigationRef.navigate(BitpayIdScreens.PROFILE);
      }

      dispatch(BitPayIdActions.updateLoginStatus(null));
      return;
    }

    if (loginStatus === 'failed') {
      captchaRef.current?.reset();

      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: t('Login failed'),
          message:
            loginError ||
            t(
              'Could not log in. Please review your information and try again.',
            ),
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(BitPayIdActions.updateLoginStatus(null));
              },
            },
          ],
        }),
      );
      return;
    }

    if (loginStatus === 'twoFactorPending') {
      navigation.navigate('TwoFactorAuthentication', {onLoginSuccess});
      return;
    }

    if (loginStatus === 'emailAuthenticationPending') {
      navigation.navigate('EmailAuthentication', {onLoginSuccess});
      return;
    }
  }, [dispatch, onLoginSuccess, navigation, loginStatus, loginError, t]);

  const onSubmit = handleSubmit(
    ({email, password}) => {
      Keyboard.dismiss();
      if (session.captchaDisabled) {
        dispatch(BitPayIdEffects.startLogin({email, password}));
      } else {
        setCaptchaModalVisible(true);
      }
    },
    () => {
      Keyboard.dismiss();
    },
  );

  const onTroubleLoggingIn = () => {
    navigation.navigate('ForgotPassword');
  };

  const onCaptchaResponse = async (gCaptchaResponse: string) => {
    const {email, password} = getValues();
    setCaptchaModalVisible(false);
    await sleep(500);
    dispatch(BitPayIdEffects.startLogin({email, password, gCaptchaResponse}));
  };

  const onCaptchaCancel = () => {
    haptic('notificationWarning');
    setCaptchaModalVisible(false);
  };

  return (
    <SafeAreaView accessibilityLabel="login-view">
      <AuthFormContainer accessibilityLabel="auth-form-container">
        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                accessibilityLabel="email-box-input"
                placeholder={'satoshi@example.com'}
                label={t('EMAIL')}
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
                accessibilityLabel="password-box-input"
                ref={passwordRef}
                placeholder={'strongPassword123'}
                label={t('PASSWORD')}
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

        <AuthActionsContainer accessibilityLabel="auth-cta-container">
          <AuthActionRow>
            <Button accessibilityLabel="login-button" onPress={onSubmit}>
              {t('Log In')}
            </Button>
          </AuthActionRow>

          <AuthActionRow>
            <AuthActionText>
              {t("Don't have an account?")}{' '}
              <Link
                accessibilityLabel="create-account-button"
                onPress={() => {
                  navigation.navigate('CreateAccount');
                }}>
                {t('Create Account')}
              </Link>
            </AuthActionText>
          </AuthActionRow>

          <AuthActionRow>
            <AuthActionText>
              <Link
                accessibilityLabel="trouble-logging-in-button"
                onPress={() => onTroubleLoggingIn()}>
                {t('Trouble logging in?')}
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
