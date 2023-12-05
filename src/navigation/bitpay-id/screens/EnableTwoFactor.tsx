import React from 'react';
import styled from 'styled-components/native';
import {ActiveOpacity, Br} from '../../../components/styled/Containers';
import {H3, Paragraph} from '../../../components/styled/Text';
import {t} from 'i18next';
import {BitpayIdScreens, BitpayIdStackParamList} from '../BitpayIdStack';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BaseText} from '../../wallet/components/KeyDropdownOption';
import {Action, SlateDark, White} from '../../../styles/colors';
import QRCode from 'react-native-qrcode-svg';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {View, Keyboard, TouchableOpacity} from 'react-native';
import yup from '../../../lib/yup';
import {yupResolver} from '@hookform/resolvers/yup';
import {Controller, useForm} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {AppActions} from '../../../store/app';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

const EnableTwoFactorContainer = styled.SafeAreaView`
  flex: 1;
`;

const ViewContainer = styled.ScrollView`
  padding: 16px;
  flex-direction: column;
`;

const ViewBody = styled.View`
  flex-grow: 1;
  padding-bottom: 150px;
`;

const InstructionBox = styled.View`
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : '#eceffd')};
  border-radius: 8px;
  border-width: 1px;
  margin-top: 30px;
`;

const InstructionBoxHeader = styled.View`
  flex-direction: row;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#eceffd')};
  align-items: center;
`;

const InstructionBoxHeaderNumberContainer = styled.View`
  padding: 0 16px;
  margin: 12px 0;
  margin-right: 16px;
  border-right-width: 1px;
  border-right-color: ${({theme: {dark}}) => (dark ? SlateDark : '#eceffd')};
`;

const InstructionBoxHeaderNumber = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? '#1aa3ff' : Action)};
  font-size: 25px;
`;

const InstructionBoxHeaderTitle = styled(BaseText)``;

const InstructionBoxBody = styled.View`
  flex-direction: row;
  padding: 16px;
`;

const InstructionBodyText = styled(Paragraph)`
  font-size: 14px;
  line-height: 18px;
  flex: 1 1 auto;
`;

const CopyButton = styled(Button)`
  margin: 16px;
  margin-top: 0;
`;

const QRContainer = styled.View`
  ${({theme: {dark}}) =>
    dark
      ? `
  background-color: ${White};
  padding: 10px;
  margin-left: 15px;
  border-radius: 6px;
  `
      : ''};
`;

type EnableTwoFactorProps = NativeStackScreenProps<
  BitpayIdStackParamList,
  'EnableTwoFactor'
>;

export type EnableTwoFactorScreenParamList = undefined;
interface TwoFactorCodeFormValues {
  code: string;
}

const TWO_FACTOR_CODE_LENGTH = 6;

const schema = yup.object().shape({
  code: yup.string().required().length(TWO_FACTOR_CODE_LENGTH),
});

const EnableTwoFactor: React.FC<EnableTwoFactorProps> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const network = useAppSelector(({APP}) => APP.network);
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
    toggleTwoFactor(twoFactorCode);
  };
  const submitForm = async (code: string) => {
    Keyboard.dismiss();
    await onSubmit(code);
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
    dispatch(startOnGoingProcessModal('UPDATING_ACCOUNT'));
    await requestTwoFactorChange(twoFactorCode);
    await dispatch(dismissOnGoingProcessModal());
    if (otpEnabled) {
      navigation.popToTop();
      return;
    }
    navigator.navigate('BitpayId', {
      screen: BitpayIdScreens.TWO_FACTOR_ENABLED,
    });
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
      await dispatch(dismissOnGoingProcessModal());
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
                  navigator.navigate('BitpayId', {
                    screen: BitpayIdScreens.TWO_FACTOR,
                    params: {
                      onSubmit: async (twoFactorCode: string) => {
                        toggleTwoFactor(twoFactorCode);
                      },
                      twoFactorCodeLength: 6,
                    },
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
