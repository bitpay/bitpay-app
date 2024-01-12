import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useAppDispatch} from '../../../../utils/hooks/useAppDispatch';
import {Keyboard, SafeAreaView} from 'react-native';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthRowContainer,
  CheckboxControl,
  CheckboxError,
  CheckboxLabel,
} from '../../../auth/components/AuthFormContainer';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../../components/form/BoxInput';
import Button, {ButtonState} from '../../../../components/button/Button';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../../lib/yup';
import {setBuyerProvidedEmail} from '../../../../store/scan/scan.effects';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import Checkbox from '../../../../components/checkbox/Checkbox';
import A from '../../../../components/anchor/Anchor';
import {AppActions} from '../../../../store/app';

interface EnterBuyerProvidedEmailFormFieldValues {
  email: string;
  agreedToPP: boolean;
}

const schema = yup.object().shape({
  email: yup.string().email().required().trim(),
  agreedToPP: yup.boolean().oneOf([true], 'Required'),
});

const EnterBuyerProvidedEmail: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const route =
    useRoute<RouteProp<WalletGroupParamList, 'EnterBuyerProvidedEmail'>>();
  const [buttonState, setButtonState] = useState<ButtonState>();

  const {
    control,
    handleSubmit,
    formState: {errors},
    setValue,
  } = useForm<EnterBuyerProvidedEmailFormFieldValues>({
    resolver: yupResolver(schema),
  });

  const onSubmit = handleSubmit(
    async ({email}) => {
      Keyboard.dismiss();
      try {
        setButtonState('loading');
        await dispatch(setBuyerProvidedEmail(route.params.data, email));
        setButtonState('success');
      } catch (e) {
        setButtonState('failed');

        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'error',
            title: 'Something went wrong',
            message: t('Please try again.'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  setButtonState(undefined);
                },
                primary: true,
              },
            ],
          }),
        );
      }
    },
    () => {
      Keyboard.dismiss();
    },
  );

  return (
    <SafeAreaView>
      <AuthFormContainer>
        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'satoshi@example.com'}
                label={t('EMAIL')}
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

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field}) => (
              <>
                <CheckboxControl>
                  <Checkbox
                    onPress={() => setValue('agreedToPP', !field.value)}
                    checked={field.value}
                  />

                  <CheckboxLabel>
                    {t(
                      'By giving my email address, I give explicit consent to BitPay to use it to contact me about payment issues.',
                    )}

                    <A
                      href={
                        'https://bitpay.com/about/privacy/?_gl=1%2a1z0ms3d%2a_ga%2aMTg4NjQwMzI0MS4xNjM0OTM3MjMx%2a_ga_1WSHCPQXN3%2aMTY2MjQ5OTczNi4zNTcuMS4xNjYyNDk5NzUyLjQ0LjAuMA..%2a_ga_Y4SP8JSCEZ%2aMTY2MjQ5OTczNi4zNTcuMS4xNjYyNDk5NzUyLjQ0LjAuMA..%2a_ga_K01TF179SZ%2aMTY2MjQ5OTczNi4zNTguMS4xNjYyNDk5NzUyLjQ0LjAuMA..%2a_ga_JPH7WVZ7B0%2aMTY2MjQ5OTczNi4zNTguMS4xNjYyNDk5NzUyLjQ0LjAuMA..%2a_ga_X8H6CLL26F%2aMTY2MjQ5OTczNi4zNTcuMS4xNjYyNDk5NzUyLjQ0LjAuMA.'
                      }>
                      {t('View Privacy Policy')}
                    </A>
                  </CheckboxLabel>
                </CheckboxControl>

                {errors.agreedToPP?.message ? (
                  <CheckboxControl>
                    <CheckboxError>{errors.agreedToPP.message}</CheckboxError>
                  </CheckboxControl>
                ) : null}
              </>
            )}
            name="agreedToPP"
            defaultValue={false}
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <AuthActionRow>
            <Button state={buttonState} onPress={onSubmit}>
              {t('Submit')}
            </Button>
          </AuthActionRow>
        </AuthActionsContainer>
      </AuthFormContainer>
    </SafeAreaView>
  );
};

export default EnterBuyerProvidedEmail;
