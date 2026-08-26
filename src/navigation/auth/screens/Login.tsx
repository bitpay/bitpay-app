import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '../../../contexts';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {
  Keyboard,
  NativeSyntheticEvent,
  TextInput,
  TextInputEndEditingEventData,
  View,
  ViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {Link} from '../../../components/styled/Text';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {Network} from '../../../constants';
import yup from '../../../lib/yup';
import {navigationRef, RootStacks} from '../../../Root';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {sleep} from '../../../utils/helper-methods';
import {
  useAppDispatch,
  useAppSelector,
  useSensitiveRefClear,
} from '../../../utils/hooks';
import {AuthScreens, AuthGroupParamList} from '../AuthGroup';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import RecaptchaModal, {CaptchaRef} from '../components/RecaptchaModal';
import {CommonActions} from '@react-navigation/native';
import {TabsScreens} from '../../tabs/TabsStack';
import PasskeyPersonSetup from '../../../../assets/img/passkey-person-setup.svg';
import IconCreateAccount from '../../../../assets/img/icon-create-account.svg';
import {LightBlack, Slate30, SlateDark, White} from '../../../styles/colors';

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

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 18,
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    marginTop: 32,
    marginBottom: 32,
  },
  footerLink: {
    fontSize: 18,
    textAlign: 'center',
  },
});

const LoginContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.loginContainer, style]} {...rest} />
);

const DividerContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.dividerContainer, style]} {...rest} />
);

const DividerLine = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.dividerLine,
        {backgroundColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const DividerText = ({style, ...rest}: TextProps) => {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.dividerText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const FooterContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.footerContainer, style]} {...rest} />
);

const FooterLink = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <Link ref={ref} style={[styles.footerLink, style]} {...rest} />
  ),
);

const LoginScreen: React.FC<LoginScreenProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: {errors, isDirty},
  } = useForm<LoginFormFieldValues>({resolver: yupResolver(schema)});
  const network: Network = useAppSelector(({APP}) => APP.network);
  const session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const loginStatus = useAppSelector(({BITPAY_ID}) => BITPAY_ID.loginStatus);
  const loginError = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.loginError || '',
  );
  const passkeyStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.passkeyStatus,
  );
  const [isCaptchaModalVisible, setCaptchaModalVisible] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const captchaRef = useRef<CaptchaRef>(null);
  const {onLoginSuccess} = route.params || {};

  const {clearSensitive} = useSensitiveRefClear([passwordRef]);

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

      if (!passkeyStatus) {
        navigation.navigate(AuthScreens.SECURE_ACCOUNT, {context: 'login'});
      } else if (parentNav?.canGoBack()) {
        parentNav.goBack();
      } else {
        // Fresh login lands on Home; the Get Verified modal is handled there.
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
            ],
          }),
        );
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
    async ({email, password}) => {
      Keyboard.dismiss();
      clearSensitive();
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

  const loginWithPasskey = () => {
    // Use the same logic as the login button
    dispatch(BitPayIdEffects.startLogin({}));
  };

  const handleAutofill = (
    fieldName: keyof LoginFormFieldValues,
    event: NativeSyntheticEvent<TextInputEndEditingEventData>,
    currentValue: string,
  ) => {
    const text = event.nativeEvent.text;
    if (!text || text === currentValue) {
      return;
    }
    setTimeout(() => {
      setValue(fieldName, text, {shouldValidate: true, shouldDirty: true});
    }, 50);
  };

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
    <LoginContainer testID="login-view">
      <AuthFormContainer testID="auth-form-container">
        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                testID="email-box-input"
                accessibilityLabel="Email address"
                placeholder={'satoshi@example.com'}
                label={t('EMAIL')}
                onBlur={onBlur}
                onEndEditing={event => handleAutofill('email', event, value)}
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
                testID="password-box-input"
                accessibilityLabel="Password"
                ref={passwordRef}
                placeholder={'strongPassword123'}
                label={t('PASSWORD')}
                type={'password'}
                onBlur={onBlur}
                onEndEditing={event => handleAutofill('password', event, value)}
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

        <AuthActionsContainer testID="auth-cta-container">
          <AuthActionRow>
            <Button
              buttonStyle={'secondary'}
              testID="login-button"
              accessibilityLabel="Log in"
              onPress={onSubmit}
              disabled={!isDirty}>
              {t('Log In')}
            </Button>
          </AuthActionRow>

          <DividerContainer>
            <DividerLine />
            <DividerText>or</DividerText>
            <DividerLine />
          </DividerContainer>

          <AuthActionRow style={{marginBottom: 16}}>
            <Button
              buttonStyle={'secondary'}
              testID="login-passkey-button"
              accessibilityLabel="Log in with passkey"
              onPress={loginWithPasskey}
              disabled={loginStatus === 'loading'}
              icon={<PasskeyPersonSetup width={28} height={28} />}>
              {t('Log In with Passkey')}
            </Button>
          </AuthActionRow>
          <AuthActionRow>
            <Button
              buttonStyle={'secondary'}
              testID="create-account-button"
              accessibilityLabel="Create an account"
              onPress={() => {
                navigation.navigate('CreateAccount', {context: 'login'});
              }}
              disabled={loginStatus === 'loading'}
              icon={<IconCreateAccount width={28} height={28} />}>
              {t('Create an Account')}
            </Button>
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
      <FooterContainer>
        <FooterLink
          testID="trouble-logging-in-button"
          accessibilityLabel="Trouble logging in"
          onPress={() => onTroubleLoggingIn()}>
          {t('Trouble logging in?')}
        </FooterLink>
      </FooterContainer>
    </LoginContainer>
  );
};

export default LoginScreen;
