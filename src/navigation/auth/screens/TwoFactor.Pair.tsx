import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Keyboard} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import yup from '../../../lib/yup';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {TwoFactorPairingStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthScreens, AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthRowContainer,
} from '../components/AuthFormContainer';
import styled from 'styled-components/native';

export type TwoFactorPairingParamList = {
  prevCode: string;
  onLoginSuccess?: ((...args: any[]) => any) | undefined;
};

type TwoFactorPairingScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  AuthScreens.TWO_FACTOR_PAIR
>;

interface TwoFactorPairingFieldValues {
  code: string;
}
const TwoFactorPairContainer = styled.SafeAreaView`
  flex: 1;
`;

const TwoFactorPairing: React.VFC<TwoFactorPairingScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const {prevCode, onLoginSuccess} = route.params;
  const schema = yup.object().shape({
    code: yup
      .string()
      .required()
      .test(
        'NoSameCode',
        t('CannotUseSameCodeTwice'),
        value => value !== prevCode,
      ),
  });
  const twoFactorPairingStatus = useSelector<RootState, TwoFactorPairingStatus>(
    ({BITPAY_ID}) => BITPAY_ID.twoFactorPairingStatus,
  );
  const twoFactorPairingError = useSelector<RootState, string>(
    ({BITPAY_ID}) => BITPAY_ID.twoFactorPairingError || '',
  );
  const {
    control,
    formState: {errors, isValid},
    handleSubmit,
    resetField,
  } = useForm<TwoFactorPairingFieldValues>({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    return () => {
      dispatch(BitPayIdActions.updateTwoFactorPairStatus(null));
    };
  }, [dispatch]);

  useEffect(() => {
    switch (twoFactorPairingStatus) {
      case 'success':
        const parentNav = navigation.getParent();

        resetField('code');
        dispatch(BitPayIdActions.completedPairing());

        if (onLoginSuccess) {
          onLoginSuccess();
          return;
        }

        if (parentNav?.canGoBack()) {
          parentNav.goBack();
        } else {
          navigationRef.navigate(RootStacks.BITPAY_ID, {
            screen: BitpayIdScreens.PROFILE,
          });
        }

        return;

      case 'failed':
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'error',
            title: t('Login failed'),
            message:
              twoFactorPairingError || t('An unexpected error occurred.'),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  dispatch(BitPayIdActions.updateTwoFactorPairStatus(null));
                },
              },
            ],
          }),
        );
        return;
    }
  }, [
    dispatch,
    resetField,
    navigation,
    twoFactorPairingStatus,
    twoFactorPairingError,
    t,
    onLoginSuccess,
  ]);

  const onSubmit = handleSubmit(
    ({code}) => {
      Keyboard.dismiss();

      if (!code) {
        return;
      }

      dispatch(BitPayIdEffects.startTwoFactorPairing(code));
    },
    () => {
      Keyboard.dismiss();
    },
  );

  return (
    <TwoFactorPairContainer>
      <AuthFormContainer>
        <AuthFormParagraph>
          {t(
            'This additional verification will allow your device to be marked as a verified device. You will be securely connected to your BitPay ID without having to login. Please go to your authenticator app and enter the new verification code generated.',
          )}
        </AuthFormParagraph>

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'eg. 123456'}
                label={t('Code')}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.code?.message}
                value={value}
                keyboardType={'numeric'}
                onSubmitEditing={onSubmit}
              />
            )}
            name="code"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <Button onPress={onSubmit} disabled={!isValid}>
            {t('Submit')}
          </Button>
        </AuthActionsContainer>
      </AuthFormContainer>
    </TwoFactorPairContainer>
  );
};

export default TwoFactorPairing;
