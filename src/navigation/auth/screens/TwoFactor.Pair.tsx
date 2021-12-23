import {yupResolver} from '@hookform/resolvers/yup';
import {useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useDispatch, useSelector} from 'react-redux';
import * as yup from 'yup';
import Button from '../../../components/button/Button';
import BoxInput from '../../../components/form/BoxInput';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {TwoFactorPairingStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthInputContainer,
} from '../components/AuthFormContainer';

export type TwoFactorPairingParamList = {} | undefined;

type TwoFactorPairingScreenProps = StackScreenProps<
  AuthStackParamList,
  'TwoFactorAuthentication'
>;

interface TwoFactorPairingFieldValues {
  code: string;
}

const schema = yup.object().shape({
  code: yup.string().required('Required'),
});

const TwoFactorPairing: React.FC<TwoFactorPairingScreenProps> = ({
  navigation,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const twoFactorPairingStatus = useSelector<RootState, TwoFactorPairingStatus>(
    ({BITPAY_ID}) => BITPAY_ID.twoFactorPairingStatus,
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
        console.log('Pairing with two factor failed.');
        return;
    }
  }, [twoFactorPairingStatus, dispatch, navigation, resetField]);

  const onSubmit = handleSubmit(({code}) => {
    if (!code) {
      return;
    }

    dispatch(BitPayIdEffects.startTwoFactorPairing(code));
  });

  return (
    <AuthFormContainer theme={theme} header="Additional Verification">
      <AuthFormParagraph>
        This additional verification will allow your device to be marked as a
        verified device. You will be securely connected to your BitPay ID
        without having to login. Please go to your authenticator app and enter
        the new verification code generated.
      </AuthFormParagraph>

      <AuthInputContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              theme={theme}
              placeholder={'eg. 123456'}
              label={'Code'}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.code?.message}
              value={value}
              keyboardType="numeric"
            />
          )}
          name="code"
          defaultValue=""
        />
      </AuthInputContainer>

      <AuthActionsContainer>
        <Button onPress={onSubmit} disabled={!isValid}>
          Submit
        </Button>
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default TwoFactorPairing;
