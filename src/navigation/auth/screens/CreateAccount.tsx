import {yupResolver} from '@hookform/resolvers/yup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Trans, useTranslation} from 'react-i18next';
import {Keyboard, SafeAreaView, TextInput} from 'react-native';
import A from '../../../components/anchor/Anchor';
import Button from '../../../components/button/Button';
import Checkbox from '../../../components/checkbox/Checkbox';
import BoxInput from '../../../components/form/BoxInput';
import {Link} from '../../../components/styled/Text';
import {URL} from '../../../constants';
import {BASE_BITPAY_URLS} from '../../../constants/config';
import yup from '../../../lib/yup';
import {navigationRef} from '../../../Root';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AuthScreens, AuthGroupParamList} from '../AuthGroup';
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
type CreateAccountScreenProps = NativeStackScreenProps<
  AuthGroupParamList,
  AuthScreens.CREATE_ACCOUNT
>;

interface CreateAccountFieldValues {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
  agreedToTOSandPP: boolean;
  agreedToMarketingCommunications: boolean;
}

const CreateAccountScreen: React.VFC<CreateAccountScreenProps> = ({
  navigation,
}) => {
  const {t} = useTranslation();
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

  const schema = yup.object().shape({
    givenName: yup.string().required(),
    familyName: yup.string().required(),
    email: yup.string().email().required().trim(),
    password: yup.string().required(),
    agreedToTOSandPP: yup.boolean().oneOf([true], t('Required')),
    agreedToMarketingCommunications: yup.boolean(),
  });
  const {
    control,
    handleSubmit,
    formState: {errors},
    getValues,
    setValue,
  } = useForm<CreateAccountFieldValues>({resolver: yupResolver(schema)});

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());

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
        navigationRef.navigate('BitPayIdProfile');
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

  const onSubmit = handleSubmit(
    formData => {
      Keyboard.dismiss();

      const {
        email,
        givenName,
        familyName,
        agreedToTOSandPP,
        password,
        agreedToMarketingCommunications,
      } = formData;

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
          agreedToMarketingCommunications,
        }),
      );
    },
    () => {
      Keyboard.dismiss();
    },
  );

  const onCaptchaResponse = (gCaptchaResponse: string) => {
    setRecaptchaVisible(false);

    const {
      givenName,
      familyName,
      email,
      password,
      agreedToTOSandPP,
      agreedToMarketingCommunications,
    } = getValues();

    dispatch(
      BitPayIdEffects.startCreateAccount({
        givenName,
        familyName,
        email,
        password,
        agreedToTOSandPP,
        gCaptchaResponse,
        agreedToMarketingCommunications,
      }),
    );
  };

  return (
    <SafeAreaView accessibilityLabel="create-account-view">
      <AuthFormContainer accessibilityLabel="auth-form-container">
        <AuthRowContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                accessibilityLabel="first-name-box-input"
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
                accessibilityLabel="last-name-box-input"
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
                accessibilityLabel="email-box-input"
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
                accessibilityLabel="password-box-input"
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
                <CheckboxControl accessibilityLabel="agreed-terms-of-use-checkbox">
                  <Checkbox
                    onPress={() => setValue('agreedToTOSandPP', !field.value)}
                    checked={field.value}
                  />

                  <CheckboxLabel>
                    <Trans
                      i18nKey={'IAgreeToTheArgAndArg'}
                      values={{
                        0: t('Terms of Use'),
                        1: t('Privacy Policy'),
                      }}
                      components={[
                        <A href={URL.TOU_BITPAY_ID} />,
                        <A href={URL.PRIVACY_POLICY} />,
                      ]}
                    />
                  </CheckboxLabel>
                </CheckboxControl>

                {errors.agreedToTOSandPP?.message ? (
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

        <AuthRowContainer>
          <Controller
            control={control}
            render={({field}) => (
              <>
                <CheckboxControl accessibilityLabel="agreed-marketing-checkbox">
                  <Checkbox
                    onPress={() =>
                      setValue('agreedToMarketingCommunications', !field.value)
                    }
                    checked={field.value}
                  />

                  <CheckboxLabel>
                    {t(
                      'Yes, I would like to receive promotional emails from BitPay.',
                    )}
                  </CheckboxLabel>
                </CheckboxControl>
              </>
            )}
            name="agreedToMarketingCommunications"
            defaultValue={false}
          />
        </AuthRowContainer>

        <AuthActionsContainer accessibilityLabel="auth-cta-container">
          <AuthActionRow>
            <Button
              accessibilityLabel="create-account-button"
              onPress={onSubmit}>
              {t('Create Account')}
            </Button>
          </AuthActionRow>

          <AuthActionRow>
            <AuthActionText>
              {t('Already have an account?')}{' '}
              <Link
                accessibilityLabel="login-button"
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
