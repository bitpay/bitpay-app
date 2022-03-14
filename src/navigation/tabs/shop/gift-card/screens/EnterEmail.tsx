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
import {GiftCardStackParamList} from '../GiftCardStack';

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

interface EmailFormFieldValues {
  email: string;
}

const schema = yup.object().shape({
  email: yup.string().email().required(),
});

const EnterEmail = ({
  route,
}: StackScreenProps<GiftCardStackParamList, 'EnterPhone'>) => {
  const emailRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EmailFormFieldValues>({
    resolver: yupResolver(schema),
  });

  const onSubmit = handleSubmit(({email}) => {
    Keyboard.dismiss();
    console.log('email', email);
  });

  return (
    <AuthFormContainer>
      <AuthFormParagraph>
        Your email address will be used for payment notifications and receipts.
      </AuthFormParagraph>
      <AuthRowContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={'satoshi@bitpay.com'}
              label={'EMAIL ADDRESS'}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
              error={
                errors.email?.message
                  ? 'Please enter a valid email address.'
                  : undefined
              }
              keyboardType={'email-address'}
              value={value}
              defaultValue={undefined}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          )}
          name="email"
        />
      </AuthRowContainer>

      <AuthActionsContainer>
        <PrimaryActionContainer>
          <Button onPress={onSubmit}>Continue</Button>
        </PrimaryActionContainer>
      </AuthActionsContainer>
    </AuthFormContainer>
  );
};

export default EnterEmail;
