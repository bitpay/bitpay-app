import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Keyboard, TextInput} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import BoxInput from '../../../../../components/form/BoxInput';
import yup from '../../../../../lib/yup';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthRowContainer,
} from '../../../../auth/components/AuthFormContainer';
import {WalletStackParamList} from '../../../WalletStack';
import {BillStackParamList} from '@/navigation/tabs/shop/bill/BillStack';

const COINBASE_SMS_2FA_CODE_LENGTH = 7;

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

export interface PayProConfirmTwoFactorParamList {
  onSubmit: (code: string) => Promise<void>;
  twoFactorCodeLength?: number;
}

interface TwoFactorCodeFormValues {
  code: string;
}

const schema = yup.object().shape({
  code: yup.string().required(),
});

const PayProConfirmTwoFactor = ({
  route,
}:
  | NativeStackScreenProps<WalletStackParamList, 'PayProConfirmTwoFactor'>
  | NativeStackScreenProps<BillStackParamList, 'BillConfirmTwoFactor'>) => {
  const {t} = useTranslation();
  const {onSubmit, twoFactorCodeLength} = route.params;
  const codeRef = useRef<TextInput>(null);
  const [submitDisabled, setSubmitDisabled] = useState(false);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<TwoFactorCodeFormValues>({
    resolver: yupResolver(schema),
  });

  const submitForm = async (code: string) => {
    setSubmitDisabled(true);
    Keyboard.dismiss();
    try {
      await onSubmit(code);
    } catch (err) {
      setSubmitDisabled(false);
    }
  };

  const onFormSubmit = handleSubmit(async ({code}) => submitForm(code));

  return (
    <AuthFormContainer>
      <AuthFormParagraph>
        {t('Please enter your two-step verification code.')}
      </AuthFormParagraph>
      <AuthRowContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={twoFactorCodeLength === 6 ? '123123' : '1231234'}
              label={t('TWO-STEP VERIFICATION CODE')}
              onBlur={onBlur}
              onChangeText={(text: string) => {
                onChange(text);
                const codeLength =
                  twoFactorCodeLength || COINBASE_SMS_2FA_CODE_LENGTH;
                if (text.length === codeLength) {
                  submitForm(text);
                }
              }}
              error={
                errors.code?.message
                  ? t('Please enter a valid verification code.')
                  : undefined
              }
              keyboardType={'numeric'}
              textContentType="oneTimeCode"
              autoFocus
              value={value}
              returnKeyType="next"
              onSubmitEditing={() => codeRef.current?.focus()}
              blurOnSubmit={false}
            />
          )}
          name="code"
        />
      </AuthRowContainer>

      <AuthActionsContainer>
        <PrimaryActionContainer>
          <Button onPress={onFormSubmit} disabled={submitDisabled}>
            {t('Continue')}
          </Button>
        </PrimaryActionContainer>
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default PayProConfirmTwoFactor;
