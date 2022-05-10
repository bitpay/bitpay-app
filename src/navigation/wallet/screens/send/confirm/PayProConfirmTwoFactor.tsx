import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Keyboard, TextInput} from 'react-native';
import styled from 'styled-components/native';
import * as yup from 'yup';
import Button from '../../../../../components/button/Button';
import BoxInput from '../../../../../components/form/BoxInput';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthRowContainer,
} from '../../../../auth/components/AuthFormContainer';
import {WalletStackParamList} from '../../../WalletStack';

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

interface TwoFactorCodeFormValues {
  code: string;
}

const schema = yup.object().shape({
  code: yup.string().required(),
});

const PayProConfirmTwoFactor = ({
  route,
}: StackScreenProps<WalletStackParamList, 'PayProConfirmTwoFactor'>) => {
  const {onSubmit} = route.params;
  const codeRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<TwoFactorCodeFormValues>({
    resolver: yupResolver(schema),
  });

  const onFormSubmit = handleSubmit(({code}) => {
    Keyboard.dismiss();
    onSubmit(code);
  });

  return (
    <AuthFormContainer>
      <AuthFormParagraph>
        Please enter your two-step verification code.
      </AuthFormParagraph>
      <AuthRowContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={'1231234'}
              label={'TWO-STEP VERIFICATION CODE'}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
              error={
                errors.code?.message
                  ? 'Please enter a valid verification code.'
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
          <Button onPress={onFormSubmit}>Continue</Button>
        </PrimaryActionContainer>
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default PayProConfirmTwoFactor;
