import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Keyboard, StyleSheet, View} from 'react-native';
import Button from '../../../../../components/button/Button';
import BoxInput from '../../../../../components/form/BoxInput';
import yup from '../../../../../lib/yup';
import AuthFormContainer, {
  AuthActionsContainer,
  AuthFormParagraph,
  AuthRowContainer,
} from '../../../../auth/components/AuthFormContainer';
import {GiftCardGroupParamList} from '../GiftCardGroup';
import {ScreenContainer} from '../../components/styled/ShopTabComponents';

const styles = StyleSheet.create({
  primaryActionContainer: {
    marginBottom: 20,
  },
});

const PrimaryActionContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.primaryActionContainer, style]} {...rest} />
);

interface EmailFormFieldValues {
  email: string;
}

const schema = yup.object().shape({
  email: yup.string().email().required().trim(),
});

const EnterEmail = ({
  route,
}: NativeStackScreenProps<GiftCardGroupParamList, 'EnterEmail'>) => {
  const {t} = useTranslation();
  const {onSubmit, initialEmail} = route.params;

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EmailFormFieldValues>({
    resolver: yupResolver(schema),
  });

  const onFormSubmit = handleSubmit(({email}) => {
    Keyboard.dismiss();
    onSubmit(email);
  });

  return (
    <ScreenContainer>
      <AuthFormContainer>
        <AuthFormParagraph>
          {t(
            'Your email address will be used for payment notifications and receipts.',
          )}
        </AuthFormParagraph>
        <AuthRowContainer>
          <Controller
            control={control}
            defaultValue={initialEmail}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'satoshi@bitpay.com'}
                label={t('EMAIL ADDRESS')}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.email?.message}
                keyboardType={'email-address'}
                value={value}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            )}
            name="email"
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <PrimaryActionContainer>
            <Button onPress={onFormSubmit}>{t('Continue')}</Button>
          </PrimaryActionContainer>
        </AuthActionsContainer>
      </AuthFormContainer>
    </ScreenContainer>
  );
};

export default EnterEmail;
