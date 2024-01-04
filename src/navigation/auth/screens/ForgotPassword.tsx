import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from 'react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Keyboard, SafeAreaView} from 'react-native';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import yup from '../../../lib/yup';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch} from '../../../utils/hooks/useAppDispatch';
import {useAppSelector} from '../../../utils/hooks/useAppSelector';
import {AuthScreens, AuthGroupParamList} from '../AuthGroup';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import RecaptchaModal from '../components/RecaptchaModal';

export type ForgotPasswordParamList = {} | undefined;

const schema = yup.object().shape({
  email: yup.string().email().required().trim(),
});

interface ResetPasswordFormFieldValues {
  email: string;
}

const ForgotPasswordScreen: React.VFC<
  NativeStackScreenProps<AuthGroupParamList, AuthScreens.FORGOT_PASSWORD>
> = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const [isCaptchaModalVisible, setCaptchaModalVisible] = useState(false);
  const network = useAppSelector(({APP}) => APP.network);
  const forgotPasswordEmailStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.forgotPasswordEmailStatus,
  );

  const {
    control,
    handleSubmit,
    getValues,
    formState: {errors},
  } = useForm<ResetPasswordFormFieldValues>({resolver: yupResolver(schema)});

  useEffect(() => {
    if (!forgotPasswordEmailStatus) {
      return;
    }
    const {status, message} = forgotPasswordEmailStatus;

    if (status === 'success') {
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'success',
          title: t('Email Sent'),
          message,
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(BitPayIdActions.resetForgotPasswordEmailStatus());
              },
            },
          ],
        }),
      );
    } else if (status === 'failed') {
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message,
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(BitPayIdActions.resetForgotPasswordEmailStatus());
              },
            },
          ],
        }),
      );
    }
  }, [dispatch, forgotPasswordEmailStatus, t]);

  const onSubmit = handleSubmit(
    ({email}) => {
      Keyboard.dismiss();

      if (session.captchaDisabled) {
        dispatch(BitPayIdEffects.startSubmitForgotPasswordEmail({email}));
      } else {
        setCaptchaModalVisible(true);
      }
    },
    () => {
      Keyboard.dismiss();
    },
  );

  const onCaptchaResponse = async (gCaptchaResponse: string) => {
    const {email} = getValues();
    setCaptchaModalVisible(false);
    await sleep(500);
    dispatch(
      BitPayIdEffects.startSubmitForgotPasswordEmail({email, gCaptchaResponse}),
    );
  };

  const onCaptchaCancel = () => {
    haptic('notificationWarning');
    setCaptchaModalVisible(false);
  };
  return (
    <SafeAreaView accessibilityLabel="reset-password-container">
      <AuthFormContainer>
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
                onSubmitEditing={onSubmit}
              />
            )}
            name="email"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <AuthActionRow>
            <Button
              accessibilityLabel="reset-password-button"
              onPress={onSubmit}>
              {t('Reset Password')}
            </Button>
          </AuthActionRow>
        </AuthActionsContainer>

        <RecaptchaModal
          isVisible={isCaptchaModalVisible}
          sitekey={session.noCaptchaKey}
          baseUrl={BASE_BITPAY_URLS[network]}
          onResponse={onCaptchaResponse}
          onCancel={onCaptchaCancel}
        />
      </AuthFormContainer>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
