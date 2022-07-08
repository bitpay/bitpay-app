import {yupResolver} from '@hookform/resolvers/yup';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {SafeAreaView, TextInput} from 'react-native';
import * as yup from 'yup';
import A from '../../../components/anchor/Anchor';
import Button from '../../../components/button/Button';
import Checkbox from '../../../components/checkbox/Checkbox';
import BoxInput from '../../../components/form/BoxInput';
import {Link} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import {navigationRef} from '../../../Root';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthActionRow,
  AuthActionsContainer,
  AuthActionText,
  AuthRowContainer,
  CheckboxControl,
  CheckboxError,
  CheckboxLabel,
} from '../components/AuthFormContainer';
import RecaptchaModal, {CaptchaRef} from '../components/RecaptchaModal';

export type CreateAccountScreenParamList = {} | undefined;
type CreateAccountScreenProps = StackScreenProps<
  AuthStackParamList,
  'CreateAccount'
>;

const schema = yup.object().shape({
  givenName: yup.string().required('Required'),
  familyName: yup.string().required('Required'),
  email: yup.string().email().required('Required').trim(),
  password: yup.string().required('Required'),
  agreedToTOSandPP: yup.boolean().oneOf([true], 'Required'),
});

interface CreateAccountFieldValues {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
  agreedToTOSandPP: boolean;
}

const CreateAccountScreen: React.FC<CreateAccountScreenProps> = ({
  navigation,
}) => {
  const {t} = useTranslation();
  const {
    control,
    handleSubmit,
    formState: {errors},
    getValues,
    setValue,
  } = useForm<CreateAccountFieldValues>({resolver: yupResolver(schema)});
  const familyNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const network = useAppSelector(({APP}) => APP.network);
  const session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const createAccountStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.createAccountStatus,
  );
  const createAccountError = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.createAccountError,
  );
  const isVerified = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.verified,
  );
  const dispatch = useAppDispatch();
  const [isRecaptchaVisible, setRecaptchaVisible] = useState(false);
  const captchaRef = useRef<CaptchaRef>(null);

  useEffect(() => {
    return () => {
      dispatch(BitPayIdActions.updateCreateAccountStatus(null));
    };
  }, [dispatch]);

  useEffect(() => {
    if (createAccountStatus === 'success') {
      if (!isVerified) {
        navigation.navigate('VerifyEmail');
        return;
      }

      dispatch(BitPayIdActions.updateCreateAccountStatus(null));

      const navParent = navigation.getParent();

      if (navParent?.canGoBack()) {
        navParent.goBack();
      } else {
        navigationRef.navigate('BitpayId', {
          screen: 'Profile',
        });
      }
    } else if (createAccountStatus === 'failed') {
      captchaRef.current?.reset();
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: t('Create account failed'),
          message: createAccountError || t('An unexpected error occurred.'),
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(BitPayIdActions.updateCreateAccountStatus(null));
              },
            },
          ],
        }),
      );
      return;
    }
  }, [
    dispatch,
    navigation,
    createAccountStatus,
    isVerified,
    createAccountError,
    t,
  ]);

  const onSubmit = handleSubmit(formData => {
    const {email, givenName, familyName, agreedToTOSandPP, password} = formData;

    if (!session.captchaDisabled) {
      setRecaptchaVisible(true);
      return;
    }

    dispatch(
      BitPayIdEffects.startCreateAccount({
        givenName,
        familyName,
        email,
        password,
        agreedToTOSandPP,
      }),
    );
  });

  const onCaptchaResponse = (gCaptchaResponse: string) => {
    setRecaptchaVisible(false);

    const {givenName, familyName, email, password, agreedToTOSandPP} =
      getValues();

    dispatch(
      BitPayIdEffects.startCreateAccount({
        givenName,
        familyName,
        email,
        password,
        agreedToTOSandPP,
        gCaptchaResponse,
      }),
    );
  };

  return (
    <SafeAreaView>
      <AuthFormContainer>
        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'Satoshi'}
                label={t('FIRST NAME')}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.givenName?.message}
                value={value}
                returnKeyType="next"
                onSubmitEditing={() => familyNameRef.current?.focus()}
                blurOnSubmit={false}
              />
            )}
            name="givenName"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                ref={familyNameRef}
                placeholder={'Nakamoto'}
                label={t('LAST NAME')}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.familyName?.message}
                value={value}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            )}
            name="familyName"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                ref={emailRef}
                placeholder={'satoshi@example.com'}
                label={t('EMAIL')}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.email?.message}
                value={value}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            )}
            name="email"
            defaultValue=""
          />
        </AuthRowContainer>

        <AuthRowContainer style={{marginBottom: 32}}>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                ref={passwordRef}
                type="password"
                placeholder={'strongPassword123'}
                label={t('PASSWORD')}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.password?.message}
                value={value}
              />
            )}
            name="password"
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
                    onPress={() => setValue('agreedToTOSandPP', !field.value)}
                    checked={field.value}
                  />

                  <CheckboxLabel>
                    I agree to the <A href={URL.TOU_BITPAY_ID}>Terms of Use</A>{' '}
                    and <A href={URL.PRIVACY_POLICY}>Privacy Policy</A>.
                  </CheckboxLabel>
                </CheckboxControl>

                {errors.agreedToTOSandPP ? (
                  <CheckboxControl>
                    <CheckboxError>
                      {errors.agreedToTOSandPP.message}
                    </CheckboxError>
                  </CheckboxControl>
                ) : null}
              </>
            )}
            name="agreedToTOSandPP"
            defaultValue={false}
          />
        </AuthRowContainer>

        <AuthActionsContainer>
          <AuthActionRow>
            <Button onPress={onSubmit}>{t('Create Account')}</Button>
          </AuthActionRow>

          <AuthActionRow>
            <AuthActionText>
              {t('Already have an account?')}{' '}
              <Link
                onPress={() => {
                  navigation.navigate('Login');
                }}>
                {t('Log In')}
              </Link>
            </AuthActionText>
          </AuthActionRow>
        </AuthActionsContainer>
      </AuthFormContainer>

      <RecaptchaModal
        ref={captchaRef}
        baseUrl={BASE_BITPAY_URLS[network]}
        sitekey={session.noCaptchaKey}
        isVisible={isRecaptchaVisible}
        onResponse={onCaptchaResponse}
        onCancel={() => setRecaptchaVisible(false)}
      />
    </SafeAreaView>
  );
};

export default CreateAccountScreen;
