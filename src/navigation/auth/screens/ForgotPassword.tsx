import React, {useEffect, useRef, useState} from 'react';
import {Keyboard, SafeAreaView} from 'react-native';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import {Controller, useForm} from 'react-hook-form';
import * as yup from 'yup';
import {yupResolver} from '@hookform/resolvers/yup';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import RecaptchaModal, {CaptchaRef} from '../components/RecaptchaModal';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {useAppSelector} from '../../../utils/hooks/useAppSelector';
import {sleep} from '../../../utils/helper-methods';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import haptic from '../../../components/haptic-feedback/haptic';
import {useAppDispatch} from '../../../utils/hooks/useAppDispatch';
import AlertBox from '../../../components/alert-box/AlertBox';

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
  const captchaRef = useRef<CaptchaRef>(null);
  const forgotPasswordEmailStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.forgotPasswordEmailStatus,
  );

  const [status, setStatus] = useState<string | null>();
  const [message, setMessage] = useState<string | null>();
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
    setStatus(forgotPasswordEmailStatus.status);
    setMessage(forgotPasswordEmailStatus.message);
    const timer = setTimeout(() => {
      dispatch(BitPayIdActions.resetForgotPasswordEmailStatus());
    }, 1000);

    return () => clearTimeout(timer);
  }, [forgotPasswordEmailStatus]);

  const onSubmit = handleSubmit(({email}) => {
    setStatus(null);
    setMessage(null);
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
        {status === 'failed' ? (
          <AuthRowContainer>
            <AlertBox type="warning">{message}</AlertBox>
          </AuthRowContainer>
        ) : null}

        {status === 'success' ? (
          <AuthRowContainer>
            <AlertBox type="success">{message}</AlertBox>
          </AuthRowContainer>
        ) : null}

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

export default ForgotPassword;
