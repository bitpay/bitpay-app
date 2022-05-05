import * as yup from 'yup';
import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Keyboard, TextInput, View} from 'react-native';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import BoxInput from '../../../../../components/form/BoxInput';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthRowContainer,
} from '../../../../auth/components/AuthFormContainer';
import RemoteImage from '../../components/RemoteImage';
import {GiftCardStackParamList} from '../GiftCardStack';

import {BaseText} from '../../../../../components/styled/Text';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {AppActions} from '../../../../../store/app';
import PhoneCountryModal from '../../components/PhoneCountryModal';
import {
  getPhoneCountryCodes,
  PhoneCountryCode,
} from '../../../../../lib/gift-cards/gift-card';

function getPhoneMask(phoneCountryCode: string) {
  const usMask = '([000]) [000]-[0000]';
  return phoneCountryCode === '1' ? usMask : '[000000000000000]';
}

function getPlaceholder(phoneCountryCode: string) {
  return phoneCountryCode === '1' ? '(610) 245-1933' : '6102451933';
}

const AreaCodeContainer = styled.View`
  flex-direction: row;
  position: absolute;
  left: 0;
  align-items: center;
  justify-content: center;
  padding-left: 15px;
  padding-right: 10px;
  height: 37px;
  width: 80px;
  border-right-width: 1px;
  border-right-color: ${({theme}) => (theme.dark ? '#45484E' : '#eceffd')};
`;

const AreaCode = styled(BaseText)`
  padding-left: 8px;
  font-weight: 600;
`;

const PrimaryActionContainer = styled.View`
  margin-bottom: 20px;
`;

export const showCountryCodeRequiredSheet = (
  phoneCountryCode: PhoneCountryCode,
) => {
  const {countryCode, name} = phoneCountryCode;
  return AppActions.showBottomNotificationModal({
    type: 'info',
    title: `${countryCode === 'US' ? 'U.S.' : countryCode} phone required`,
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

const basePhoneSchema = yup.string().required();
const usPhoneSchema = basePhoneSchema.min(10, 'Must be exactly 10 digits');
const intlPhoneSchema = basePhoneSchema.max(
  15,
  'Must be no longer than 15 digits',
);
interface PhoneFormFieldValues {
  phone: string;
}

const EnterPhone = ({
  route,
}: StackScreenProps<GiftCardStackParamList, 'EnterPhone'>) => {
  const dispatch = useDispatch();
  const phoneRef = useRef<TextInput>(null);
  const {cardConfig, onSubmit, initialPhone, initialPhoneCountryInfo} =
    route.params;

  const allowedPhoneCountryCodes = getPhoneCountryCodes().filter(
    phoneCountryCode =>
      cardConfig.allowedPhoneCountries
        ? cardConfig.allowedPhoneCountries.includes(
            phoneCountryCode.countryCode,
          )
        : true,
  );

  const defaultPhoneCountryCode =
    (initialPhoneCountryInfo &&
      allowedPhoneCountryCodes.find(
        phoneCountryCode =>
          phoneCountryCode.phone === initialPhoneCountryInfo.phoneCountryCode &&
          phoneCountryCode.countryCode ===
            initialPhoneCountryInfo.countryIsoCode,
      )) ||
    allowedPhoneCountryCodes[0];
  const [selectedPhoneCountryCode, setSelectedPhoneCountryCode] = useState(
    defaultPhoneCountryCode,
  );
  const [countryCodeSheetOpen, setCountryCodeSheetOpen] = useState(false);

  const phoneWithoutCountryCode =
    defaultPhoneCountryCode.phone ===
      initialPhoneCountryInfo.phoneCountryCode &&
    defaultPhoneCountryCode.countryCode ===
      initialPhoneCountryInfo.countryIsoCode
      ? initialPhone.replace(defaultPhoneCountryCode.phone, '')
      : '';

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<PhoneFormFieldValues>({
    defaultValues: {phone: phoneWithoutCountryCode},
    resolver: yupResolver(
      yup.object().shape({
        phone:
          selectedPhoneCountryCode.phone === '1'
            ? usPhoneSchema
            : intlPhoneSchema,
      }),
    ),
  });

  const onFormSubmit = handleSubmit(({phone}) => {
    Keyboard.dismiss();
    const fullPhoneNumber = `${selectedPhoneCountryCode.phone}${phone.replace(
      /\D/g,
      '',
    )}`;
    onSubmit({
      phone: fullPhoneNumber,
      phoneCountryInfo: {
        phoneCountryCode: selectedPhoneCountryCode.phone,
        countryIsoCode: selectedPhoneCountryCode.countryCode,
      },
    });
  });

  return (
    <>
      <AuthFormContainer>
        <AuthFormParagraph>
          Your phone number will be used to secure your gift card with 2-factor
          authentication.
        </AuthFormParagraph>
        <AuthRowContainer>
          <Controller
            control={control}
            defaultValue={phoneWithoutCountryCode}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={getPlaceholder(selectedPhoneCountryCode.phone)}
                label={'PHONE NUMBER'}
                onBlur={onBlur}
                onChangeText={(formatted: string, extracted?: string) =>
                  onChange(extracted)
                }
                icon={() => (
                  <AreaCodeContainer>
                    <TouchableWithoutFeedback
                      onPress={() => {
                        (cardConfig.allowedPhoneCountries || []).length === 1
                          ? dispatch(
                              showCountryCodeRequiredSheet(
                                selectedPhoneCountryCode,
                              ),
                            )
                          : setCountryCodeSheetOpen(true);
                      }}>
                      <View style={{flexDirection: 'row'}}>
                        <RemoteImage
                          height={20}
                          uri={`https://bitpay.com/img/flags-round/${selectedPhoneCountryCode.countryCode.toLowerCase()}.svg`}
                        />
                        <AreaCode>+{selectedPhoneCountryCode.phone}</AreaCode>
                      </View>
                    </TouchableWithoutFeedback>
                  </AreaCodeContainer>
                )}
                error={
                  errors.phone?.message
                    ? 'Please enter a valid phone number.'
                    : undefined
                }
                mask={getPhoneMask(selectedPhoneCountryCode.phone)}
                keyboardType={'numeric'}
                value={value}
                type={'phone'}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
            )}
            name="phone"
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <PrimaryActionContainer>
            <Button onPress={onFormSubmit}>Continue</Button>
          </PrimaryActionContainer>
        </AuthActionsContainer>
      </AuthFormContainer>
      <PhoneCountryModal
        visible={countryCodeSheetOpen}
        phoneCountryCodes={allowedPhoneCountryCodes}
        onClose={() => setCountryCodeSheetOpen(false)}
        onSelectedPhoneCountryCode={phoneCountryCode => {
          setSelectedPhoneCountryCode(phoneCountryCode);
          setCountryCodeSheetOpen(false);
        }}
      />
    </>
  );
};

export default EnterPhone;
