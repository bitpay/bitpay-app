import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useMemo} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import * as yup from 'yup';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {TwoFactorPairingStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthRowContainer,
} from '../components/AuthFormContainer';

export type TwoFactorPairingParamList = {
  prevCode: string;
};

type TwoFactorPairingScreenProps = StackScreenProps<
  AuthStackParamList,
  'TwoFactorPairing'
>;

interface TwoFactorPairingFieldValues {
  code: string;
}

const TwoFactorPairing: React.FC<TwoFactorPairingScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const {prevCode} = route.params;
  const schema = useMemo(() => {
    return yup.object().shape({
      code: yup
        .string()
        .required('Required')
        .test(
          'NoSameCode',
          'Cannot use the same code twice.',
          value => value !== prevCode,
        ),
    });
  }, [prevCode]);
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
  ]);

  const onSubmit = handleSubmit(({code}) => {
    if (!code) {
      return;
    }

    dispatch(BitPayIdEffects.startTwoFactorPairing(code));
  });

  return (
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
              keyboardType="numeric"
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
  );
};

export default TwoFactorPairing;
