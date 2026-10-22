import React, {useLayoutEffect, useState} from 'react';
import {
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import Button, {ButtonState} from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {BaseText} from '../../../components/styled/Text';
import {
  Action,
  LinkBlue,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {useTheme} from '../../../contexts';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {AppEffects} from '../../../store/app';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {getErrorString} from '../../../utils/helper-methods';
import yup from '../../../lib/yup';
import TransakLogo from '../../../components/icons/external-services/transak/transak-logo';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  TransakHeadlessUserAuthData,
  TransakHeadlessVerifyOtpData,
} from '../../../store/buy-crypto/buy-crypto.models';
import {
  TransakHeadlessError,
  transakHeadlessSendOtp,
  transakHeadlessVerifyOtp,
} from '../../../store/buy-crypto/effects/transak/transak-headless';
import {transakEnv} from '../buy-crypto/utils/transak-utils';
import {
  ExternalServicesGroupParamList,
  ExternalServicesScreens,
} from '../ExternalServicesGroup';

const OTP_LENGTH = 6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 14,
  },
  headerContainer: {
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 31,
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSection: {
    padding: 16,
  },
  legalText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
});

const Container: React.FC<ViewProps> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.container, style]} {...rest} />
);

const HeaderContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.headerContainer, style]} {...rest} />
);

const IconRow: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.iconRow, style]} {...rest} />
);

const Title = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[styles.title, {color: theme.dark ? White : SlateDark}, style]}
        {...rest}
      />
    );
  },
);
Title.displayName = 'Title';

const Subtitle = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.subtitle,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Subtitle.displayName = 'Subtitle';

const InputContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.inputContainer, style]} {...rest} />
);

const SecondaryActions: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.secondaryActions, style]} {...rest} />
);

const ActionLink = React.forwardRef<Text, TextProps & {disabled?: boolean}>(
  ({style, disabled, onPress, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        onPress={disabled ? undefined : onPress}
        style={[
          styles.secondaryActionText,
          {
            color: theme.dark ? LinkBlue : Action,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);
ActionLink.displayName = 'ActionLink';

const BottomSection: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.bottomSection, style]} {...rest} />
);

const LegalText = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.legalText,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
LegalText.displayName = 'LegalText';

const LegalLink = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Text
      ref={ref}
      style={[{color: theme.dark ? LinkBlue : Action}, style]}
      {...rest}
    />
  );
});
LegalLink.displayName = 'LegalLink';

export interface TransakBuyHeadlessOnboardingProps {
  wallet: Wallet;
  country?: string;
  initialEmail?: string;
  // Kept loading until it resolves, while the checkout is prepared.
  onConnect: (userAuth: TransakHeadlessUserAuthData) => Promise<void> | void;
  // manualSkip is false when the onboarding gave up on its own.
  onSkip: (manualSkip: boolean) => void;
}

const emailSchema = yup.string().email().required().trim();

const TransakBuyHeadlessOnboarding = ({
  route,
}: NativeStackScreenProps<
  ExternalServicesGroupParamList,
  ExternalServicesScreens.TRANSAK_BUY_HEADLESS_ONBOARDING
>) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const logger = useLogger();
  const dispatch = useAppDispatch();

  const {wallet, country, initialEmail, onConnect, onSkip} = route.params;

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState<string>(initialEmail ?? '');
  const [emailError, setEmailError] = useState<string>();
  const [code, setCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>();
  const [stateToken, setStateToken] = useState<string>();
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [resending, setResending] = useState(false);

  const busy = !!buttonState || resending;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
    });
  }, [navigation]);

  const sendCode = async (normalizedEmail: string): Promise<boolean> => {
    try {
      const data = await transakHeadlessSendOtp(wallet, {
        env: transakEnv,
        email: normalizedEmail,
      });
      if (!data?.stateToken) {
        throw new Error('No stateToken returned');
      }
      setStateToken(data.stateToken);
      dispatch(Analytics.track('Transak Headless Onboarding: code sent'));
      return true;
    } catch (err) {
      logger.error(
        `[TransakHeadlessOnboarding] send code failed: ${getErrorString(err)}`,
      );
      setEmailError(
        t('We could not send the code. Please check your email and try again.'),
      );
      return false;
    }
  };

  const submitEmail = async () => {
    Keyboard.dismiss();
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailSchema.isValidSync(normalizedEmail)) {
      setEmailError(t('Please enter a valid email address.'));
      return;
    }
    setEmailError(undefined);
    setButtonState('loading');
    const sent = await sendCode(normalizedEmail);
    setButtonState(undefined);
    if (sent) {
      setEmail(normalizedEmail);
      setCode('');
      setCodeError(undefined);
      setStep('code');
    }
  };

  const resendCode = async () => {
    setResending(true);
    setCode('');
    setCodeError(undefined);
    const sent = await sendCode(email);
    setResending(false);
    if (!sent) {
      setStep('email');
    }
  };

  const submitCode = async () => {
    Keyboard.dismiss();
    if (!stateToken || code.length !== OTP_LENGTH) {
      setCodeError(t('Enter the 6-digit code.'));
      return;
    }
    setCodeError(undefined);
    setButtonState('loading');
    let data: TransakHeadlessVerifyOtpData;
    try {
      data = await transakHeadlessVerifyOtp(wallet, {
        env: transakEnv,
        email,
        otp: code,
        stateToken,
      });
      if (!data?.accessToken || !data.ttl) {
        throw new Error('No accessToken returned');
      }
      dispatch(Analytics.track('Transak Headless Onboarding: connected'));
    } catch (err) {
      logger.error(
        `[TransakHeadlessOnboarding] verify code failed: ${getErrorString(
          err,
        )}`,
      );
      setButtonState(undefined);
      const isRejectedCode =
        err instanceof TransakHeadlessError &&
        !!err.statusCode &&
        err.statusCode >= 400 &&
        err.statusCode < 500;
      setCodeError(
        isRejectedCode
          ? t('The code is not valid or has expired.')
          : t('Something went wrong. Please try again later.'),
      );
      return;
    }
    await onConnect({
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.ttl * 1000,
      email,
    });
    setButtonState(undefined);
  };

  const skip = () => {
    dispatch(
      Analytics.track('Transak Headless Onboarding: manual skip', {step}),
    );
    onSkip(true);
  };

  const openUrl = (url: string) => {
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  return (
    <Container>
      <ScrollView keyboardShouldPersistTaps={'handled'}>
        <HeaderContainer>
          <IconRow>
            <TransakLogo width={120} height={40} />
          </IconRow>
          {step === 'email' ? (
            <>
              <Title>{t('Pay by card without leaving the app')}</Title>
              <Subtitle>
                {t(
                  'BitPay partners with Transak so you can buy crypto with your card right here. Verify your email with Transak to continue.',
                )}
              </Subtitle>
            </>
          ) : (
            <>
              <Title>{t('Enter verification code')}</Title>
              <Subtitle>
                {t('Transak sent a 6-digit code to {{email}}.', {email})}
              </Subtitle>
            </>
          )}
        </HeaderContainer>

        {step === 'email' ? (
          <InputContainer>
            <BoxInput
              label={t('EMAIL ADDRESS')}
              placeholder={'satoshi@bitpay.com'}
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                setEmailError(undefined);
              }}
              error={emailError}
              keyboardType={'email-address'}
              autoCapitalize={'none'}
              autoCorrect={false}
              textContentType={'emailAddress'}
              autoComplete={'email'}
              returnKeyType={'done'}
              onSubmitEditing={submitEmail}
              editable={!busy}
            />
          </InputContainer>
        ) : (
          <InputContainer>
            <BoxInput
              label={t('VERIFICATION CODE')}
              placeholder={'000000'}
              value={code}
              onChangeText={(text: string) => {
                setCode(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
                setCodeError(undefined);
              }}
              error={codeError}
              keyboardType={'number-pad'}
              textContentType={'oneTimeCode'}
              autoComplete={'one-time-code'}
              maxLength={OTP_LENGTH}
              autoFocus={true}
              returnKeyType={'done'}
              onSubmitEditing={submitCode}
              editable={!busy}
            />
            <SecondaryActions>
              <ActionLink disabled={busy} onPress={resendCode}>
                {resending ? t('Sending...') : t('Resend code')}
              </ActionLink>
              <ActionLink
                disabled={busy}
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setCodeError(undefined);
                }}>
                {t('Use a different email')}
              </ActionLink>
            </SecondaryActions>
          </InputContainer>
        )}
      </ScrollView>

      <BottomSection>
        <LegalText>
          {t('By continuing, you agree to')}{' '}
          <LegalLink
            onPress={() =>
              openUrl(
                country === 'US'
                  ? 'https://transak.com/terms-of-service-us'
                  : 'https://transak.com/terms-of-service',
              )
            }>
            {t("Transak's Terms of Service")}
          </LegalLink>
          {'.'}
        </LegalText>
        <Button
          onPress={step === 'email' ? submitEmail : submitCode}
          disabled={busy || (step === 'code' && code.length !== OTP_LENGTH)}
          state={buttonState}
          borderRadius={100}
          style={{borderRadius: 100, marginBottom: 12}}
          height={50}>
          {step === 'email' ? t('Send code') : t('Verify')}
        </Button>
        <Button
          onPress={skip}
          disabled={!!buttonState}
          buttonStyle={'secondary'}
          borderRadius={100}
          height={50}>
          {t('Continue on Transak instead')}
        </Button>
      </BottomSection>
    </Container>
  );
};

export default TransakBuyHeadlessOnboarding;
