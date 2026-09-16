import React from 'react';
import {useTheme} from '../../../contexts';
import {ActiveOpacity, Br} from '../../../components/styled/Containers';
import {BaseText, H3, Paragraph} from '../../../components/styled/Text';
import {BitpayIdScreens, BitpayIdGroupParamList} from '../BitpayIdGroup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Action, LightBlue, SlateDark, White} from '../../../styles/colors';
import QRCode from 'react-native-qrcode-svg';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {
  View,
  ViewProps,
  ScrollView,
  ScrollViewProps,
  SafeAreaView,
  Text,
  TextProps,
  Keyboard,
  StyleSheet,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import yup from '../../../lib/yup';
import {yupResolver} from '@hookform/resolvers/yup';
import {Controller, useForm} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {AppActions} from '../../../store/app';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {useTranslation} from 'react-i18next';
import {WalletScreens} from '../../../navigation/wallet/WalletGroup';
import {useOngoingProcess} from '../../../contexts';

const styles = StyleSheet.create({
  enableTwoFactorContainer: {
    flex: 1,
  },
  viewContainer: {
    padding: 16,
    flexDirection: 'column',
  },
  viewBody: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  instructionBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 30,
  },
  instructionBoxHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  instructionBoxHeaderNumberContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
    marginRight: 16,
    borderRightWidth: 1,
  },
  instructionBoxHeaderNumber: {
    fontSize: 25,
  },
  instructionBoxBody: {
    flexDirection: 'row',
    padding: 16,
  },
  instructionBodyText: {
    fontSize: 14,
    lineHeight: 18,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
  },
  copyButton: {
    margin: 16,
    marginTop: 0,
  },
  qrContainerDark: {
    backgroundColor: White,
    padding: 15,
    marginLeft: 15,
    borderRadius: 6,
  },
});

const EnableTwoFactorContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.enableTwoFactorContainer, style]} {...rest} />
);

const ViewContainer = ({style, ...rest}: ScrollViewProps) => (
  <ScrollView style={[styles.viewContainer, style]} {...rest} />
);

const ViewBody = ({style, ...rest}: ViewProps) => (
  <View style={[styles.viewBody, style]} {...rest} />
);

const InstructionBox = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.instructionBox,
        {borderColor: theme.dark ? SlateDark : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const InstructionBoxHeader = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.instructionBoxHeader,
        {borderBottomColor: theme.dark ? SlateDark : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const InstructionBoxHeaderNumberContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.instructionBoxHeaderNumberContainer,
        {borderRightColor: theme.dark ? SlateDark : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const InstructionBoxHeaderNumber = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.instructionBoxHeaderNumber,
          {color: theme.dark ? '#1aa3ff' : Action},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const InstructionBoxHeaderTitle = React.forwardRef<Text, TextProps>(
  (props, ref) => <BaseText ref={ref} {...props} />,
);

const InstructionBoxBody = ({style, ...rest}: ViewProps) => (
  <View style={[styles.instructionBoxBody, style]} {...rest} />
);

const InstructionBodyText = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => (
  <Paragraph ref={ref} style={[styles.instructionBodyText, style]} {...rest} />
));

const CopyButton: React.FC<React.ComponentProps<typeof Button>> = ({
  style,
  ...rest
}) => <Button style={[styles.copyButton, style]} {...rest} />;

const QRContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[theme.dark ? styles.qrContainerDark : null, style]}
      {...rest}
    />
  );
};

type EnableTwoFactorProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.ENABLE_TWO_FACTOR
>;

export type EnableTwoFactorScreenParamList = undefined;
interface TwoFactorCodeFormValues {
  code: string;
}

const TWO_FACTOR_CODE_LENGTH = 6;

const schema = yup.object().shape({
  code: yup.string().required().length(TWO_FACTOR_CODE_LENGTH),
});

const EnableTwoFactor = ({navigation}: EnableTwoFactorProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const network = useAppSelector(({APP}) => APP.network);
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const securitySettings = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.securitySettings[network],
  );

  const navigator = useNavigation();
  const {
    control,
    handleSubmit,
    formState: {errors, isValid, isSubmitted},
    setValue,
  } = useForm<TwoFactorCodeFormValues>({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });
  const onSubmit = async (twoFactorCode: string) => {
    return toggleTwoFactor(twoFactorCode);
  };
  const submitForm = async (code: string) => {
    Keyboard.dismiss();
    await onSubmit(code).catch(() => {});
  };
  const onFormSubmit = handleSubmit(async ({code}) => submitForm(code));

  const {otpEnabled, otpAuthKey, email} = securitySettings || {};

  const showError = ({
    error,
    defaultErrorMessage,
    onDismiss,
  }: {
    error?: any;
    defaultErrorMessage: string;
    onDismiss?: () => Promise<void>;
  }) => {
    dispatch(
      AppActions.showBottomNotificationModal(
        CustomErrorMessage({
          title: t('Error'),
          errMsg: error?.message || defaultErrorMessage,
          action: () => onDismiss && onDismiss(),
        }),
      ),
    );
  };

  const toggleTwoFactor = async (twoFactorCode: string) => {
    showOngoingProcess('UPDATING_ACCOUNT');
    await requestTwoFactorChange(twoFactorCode);
    hideOngoingProcess();
    if (otpEnabled) {
      navigation.pop(2);
      return;
    }
    navigator.navigate(BitpayIdScreens.TWO_FACTOR_ENABLED);
  };

  const requestTwoFactorChange = async (twoFactorCode: string) => {
    await dispatch(
      BitPayIdEffects.startToggleTwoFactorAuthEnabled(twoFactorCode),
    ).catch(async error => {
      showError({
        error,
        defaultErrorMessage: otpEnabled
          ? t('Could not disable two-factor authentication')
          : t('Could not enable two-factor authentication'),
      });
      hideOngoingProcess();
      throw error;
    });
  };

  const showCopiedNotification = () =>
    AppActions.showBottomNotificationModal({
      type: 'success',
      title: t('Copied 2FA Setup Key'),
      message: t('Paste this setup key into your favorite authenticator app.'),
      enableBackdropDismiss: true,
      actions: [
        {
          text: t('GOT IT'),
          action: () => null,
          primary: true,
        },
      ],
    });

  const copyToClipboard = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
    dispatch(showCopiedNotification());
  };

  const apiUrl = BASE_BITPAY_URLS[network];
  const otpIssuer = apiUrl.includes('test')
    ? 'BitPay%20Test'
    : apiUrl.includes('8088')
    ? 'BitPay%20Local'
    : 'BitPay';
  const twoFactorSetupCode = `otpauth://totp/%5Bbitpay%5D%20${email}?secret=${otpAuthKey}&issuer=${otpIssuer}`;

  return (
    <EnableTwoFactorContainer>
      <KeyboardAwareScrollView
        extraScrollHeight={111}
        keyboardShouldPersistTaps={'handled'}>
        <ViewContainer>
          {otpEnabled ? (
            <ViewBody>
              <H3>{t('Two-Factor Authentication')}</H3>
              <Br />
              <Paragraph>
                {t(
                  'Two-factor authentication is currently enabled. This improves the security of your account by requiring you to enter a code created by your authenticator app in order to sign in to your account.',
                )}
              </Paragraph>
              <Br />
              <Br />
              <Button
                buttonStyle={'primary'}
                onPress={() => {
                  navigator.navigate(WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR, {
                    onSubmit: async (twoFactorCode: string) => {
                      return toggleTwoFactor(twoFactorCode);
                    },
                    twoFactorCodeLength: 6,
                  });
                }}>
                {t('Disable')}
              </Button>
            </ViewBody>
          ) : (
            <ViewBody>
              <H3>{t('Enable Two-Factor Authentication')}</H3>
              <Br />
              <Paragraph>
                {t(
                  'Once configured, you’ll be required to enter a code created by your authenticator app in order to sign in to your account.',
                )}
              </Paragraph>
              <InstructionBox>
                <InstructionBoxHeader>
                  <InstructionBoxHeaderNumberContainer>
                    <InstructionBoxHeaderNumber>1</InstructionBoxHeaderNumber>
                  </InstructionBoxHeaderNumberContainer>
                  <InstructionBoxHeaderTitle>
                    {t('Get an Authenticator App')}
                  </InstructionBoxHeaderTitle>
                </InstructionBoxHeader>
                <InstructionBoxBody>
                  <InstructionBodyText>
                    {t(
                      'Download and install Google Authenticator or your preferred authenticator app.',
                    )}
                  </InstructionBodyText>
                </InstructionBoxBody>
              </InstructionBox>
              <InstructionBox>
                <InstructionBoxHeader>
                  <InstructionBoxHeaderNumberContainer>
                    <InstructionBoxHeaderNumber>2</InstructionBoxHeaderNumber>
                  </InstructionBoxHeaderNumberContainer>
                  <InstructionBoxHeaderTitle>
                    {t('Generate a Verification Code')}
                  </InstructionBoxHeaderTitle>
                </InstructionBoxHeader>
                <InstructionBoxBody>
                  <InstructionBodyText>
                    {t('Open your authenticator app and:')}
                    {'\n\n\u2022'} {t("Tap the '+' icon in the app")}
                    {'\n\u2022'} {t("Tap 'Scan a QR code'")}
                    {'\n\u2022'} {t('Scan or tap the QR code')}
                  </InstructionBodyText>
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    onPress={() => copyToClipboard(otpAuthKey!)}>
                    <QRContainer>
                      <QRCode value={twoFactorSetupCode} size={90} />
                    </QRContainer>
                  </TouchableOpacity>
                </InstructionBoxBody>
                <CopyButton
                  height={50}
                  buttonStyle={'secondary'}
                  onPress={() => copyToClipboard(otpAuthKey!)}>
                  {t('Copy 2FA Setup Key')}
                </CopyButton>
              </InstructionBox>
              <InstructionBox>
                <InstructionBoxHeader>
                  <InstructionBoxHeaderNumberContainer>
                    <InstructionBoxHeaderNumber>3</InstructionBoxHeaderNumber>
                  </InstructionBoxHeaderNumberContainer>
                  <InstructionBoxHeaderTitle>
                    {t('Enter Verification Code')}
                  </InstructionBoxHeaderTitle>
                </InstructionBoxHeader>
                <InstructionBoxBody>
                  <InstructionBodyText>
                    {t(
                      'Enter the 6-digit verification code from your authenticator app.',
                    )}
                  </InstructionBodyText>
                </InstructionBoxBody>
                <View style={{padding: 16, paddingTop: 0}}>
                  <Controller
                    control={control}
                    render={({field: {onChange, onBlur, value}}) => (
                      <BoxInput
                        placeholder={'123123'}
                        onBlur={onBlur}
                        onChangeText={(text: string) => {
                          onChange(text);
                          setValue('code', text);
                          if (text.length === TWO_FACTOR_CODE_LENGTH) {
                            submitForm(text);
                          }
                        }}
                        error={
                          errors.code?.message && isSubmitted
                            ? t('Please enter a valid verification code.')
                            : undefined
                        }
                        keyboardType={'numeric'}
                        textContentType="oneTimeCode"
                        maxLength={TWO_FACTOR_CODE_LENGTH}
                        value={value}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    )}
                    name="code"
                  />
                </View>
                <CopyButton
                  height={50}
                  buttonStyle={'primary'}
                  onPress={onFormSubmit}
                  disabled={!isValid}>
                  {t('Enable')}
                </CopyButton>
              </InstructionBox>
            </ViewBody>
          )}
        </ViewContainer>
      </KeyboardAwareScrollView>
    </EnableTwoFactorContainer>
  );
};

export default EnableTwoFactor;
