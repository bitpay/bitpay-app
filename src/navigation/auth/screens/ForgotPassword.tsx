import {yupResolver} from '@hookform/resolvers/yup';
import React, {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Keyboard, SafeAreaView} from 'react-native';
import * as yup from 'yup';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import haptic from '../../../components/haptic-feedback/haptic';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch} from '../../../utils/hooks/useAppDispatch';
import {useAppSelector} from '../../../utils/hooks/useAppSelector';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import RecaptchaModal from '../components/RecaptchaModal';

export type ForgotPasswordParamList = {} | undefined;

const schema = yup.object().shape({
  email: yup.string().email().required(),
});

interface ResetPasswordFormFieldValues {
  email: string;
}

const ForgotPassword = () => {
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
          title: 'Email Sent',
          message,
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
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
          title: 'Error',
          message,
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {
                dispatch(BitPayIdActions.resetForgotPasswordEmailStatus());
              },
            },
          ],
        }),
      );
    }
  }, [forgotPasswordEmailStatus]);

  const onSubmit = handleSubmit(({email}) => {
    Keyboard.dismiss();

    if (session.captchaDisabled) {
      dispatch(BitPayIdEffects.startSubmitForgotPasswordEmail({email}));
    } else {
      setCaptchaModalVisible(true);
    }
  });

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
                onSubmitEditing={onSubmit}
              />
            )}
            name="email"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <AuthActionRow>
            <Button onPress={onSubmit}>Reset Password</Button>
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

export default ForgotPassword;
