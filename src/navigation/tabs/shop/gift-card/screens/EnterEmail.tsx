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
import {AppActions} from '../../../../../store/app';
import {PhoneCountryCode} from '../../../../../lib/gift-cards/gift-card';

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

export const showCountryCodeRequiredSheet = (
  phoneCountryCode: PhoneCountryCode,
) => {
  const {countryCode, name} = phoneCountryCode;
  return AppActions.showBottomNotificationModal({
    type: 'info',
    title: `${countryCode === 'US' ? 'U.S.' : countryCode} Phone Required`,
    message: `Only a ${name} phone number can be used for this purchase.`,
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'GOT IT',
        action: () => undefined,
        primary: true,
      },
    ],
  });
};

interface PhoneFormFieldValues {
  email: string;
}

const schema = yup.object().shape({
  email: yup.string().email().required(),
});

const EnterEmail = ({
  route,
}: StackScreenProps<GiftCardStackParamList, 'EnterPhone'>) => {
  const emailRef = useRef<TextInput>(null);
  const {cardConfig} = route.params;

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<PhoneFormFieldValues>({
    resolver: yupResolver(schema),
  });

  const onSubmit = handleSubmit(({email}) => {
    Keyboard.dismiss();
    console.log('email', email);
  });

  return (
    <AuthFormContainer header={'Enter your email address'}>
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
