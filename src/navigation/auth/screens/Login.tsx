import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled from 'styled-components/native';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {
  Keyboard,
  NativeSyntheticEvent,
  TextInput,
  TextInputEndEditingEventData,
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
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
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

const LoginContainer = styled.View`
  flex: 1;
`;

const DividerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
`;

const DividerLine = styled.View`
  flex: 1;
  height: 1px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
`;

const DividerText = styled.Text`
  margin: 0 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  font-weight: 500;
`;

const FooterContainer = styled.View`
  margin-top: 32px;
  margin-bottom: 32px;
`;

const FooterLink = styled(Link)`
  font-size: 18px;
  text-align: center;
`;

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
        navigation.navigate(AuthScreens.SECURE_ACCOUNT);
      } else if (parentNav?.canGoBack()) {
        parentNav.goBack();
      } else {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              {
                name: RootStacks.TABS,
                params: {screen: TabsScreens.HOME},
              },
              {
                name: BitpayIdScreens.PROFILE,
                params: {},
              },
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
    <LoginContainer accessibilityLabel="login-view">
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
                accessibilityLabel="password-box-input"
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

        <AuthActionsContainer accessibilityLabel="auth-cta-container">
          <AuthActionRow>
            <Button
              buttonStyle={'secondary'}
              accessibilityLabel="login-button"
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
              accessibilityLabel="login-button"
              onPress={loginWithPasskey}
              disabled={loginStatus === 'loading'}
              icon={<PasskeyPersonSetup width={28} height={28} />}>
              {t('Log In with Passkey')}
            </Button>
          </AuthActionRow>
          <AuthActionRow>
            <Button
              buttonStyle={'secondary'}
              accessibilityLabel="create-account-button"
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
          accessibilityLabel="trouble-logging-in-button"
          onPress={() => onTroubleLoggingIn()}>
          {t('Trouble logging in?')}
        </FooterLink>
      </FooterContainer>
    </LoginContainer>
  );
};

export default LoginScreen;
