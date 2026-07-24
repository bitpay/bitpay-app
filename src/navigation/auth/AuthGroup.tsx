import React from 'react';
import {HeaderTitle} from '../../components/styled/Text';
import CreateAccountScreen, {
  CreateAccountScreenParamList,
} from './screens/CreateAccount';
import LoginScreen, {LoginScreenParamList} from './screens/Login';
import TwoFactorAuthentication, {
  TwoFactorAuthenticationParamList,
} from './screens/TwoFactor.Auth';
import EmailAuthentication, {
  EmailAuthenticationParamList,
} from './screens/TwoFactor.Email';
import TwoFactorPairing, {
  TwoFactorPairingParamList,
} from './screens/TwoFactor.Pair';
import VerifyEmailScreen, {
  VerifyEmailScreenParamList,
} from './screens/VerifyEmail';
import ForgotPassword, {
  ForgotPasswordParamList,
} from './screens/ForgotPassword';
import {t as i18nextT} from 'i18next';
const t = i18nextT as (key: string) => string;
import {Root} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';
import {Theme} from '@react-navigation/native';
import SecureAccount from './screens/SecureAccount';

interface AuthProps {
  Auth: typeof Root;
  theme: Theme;
}

export enum AuthScreens {
  LOGIN = 'Login',
  CREATE_ACCOUNT = 'CreateAccount',
  VERIFY_EMAIL = 'VerifyEmail',
  EMAIL_AUTH = 'EmailAuthentication',
  TWO_FACTOR_AUTH = 'TwoFactorAuthentication',
  TWO_FACTOR_PAIR = 'TwoFactorPairing',
  FORGOT_PASSWORD = 'ForgotPassword',
  SECURE_ACCOUNT = 'SecureAccount',
}

export type AuthGroupParamList = {
  Login: LoginScreenParamList;
  CreateAccount: CreateAccountScreenParamList;
  VerifyEmail: VerifyEmailScreenParamList;
  EmailAuthentication: EmailAuthenticationParamList;
  TwoFactorAuthentication: TwoFactorAuthenticationParamList;
  TwoFactorPairing: TwoFactorPairingParamList;
  ForgotPassword: ForgotPasswordParamList;
  SecureAccount: {context?: 'login' | 'signup'} | undefined;
};

const AuthGroup = ({Auth, theme}: AuthProps) => {
  const commonOptions = useStackScreenOptions(theme);

  return (
    <Auth.Group screenOptions={commonOptions}>
      <Auth.Screen
        name={AuthScreens.LOGIN}
        component={LoginScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Log In')}</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.CREATE_ACCOUNT}
        component={CreateAccountScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Create Account')}</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.VERIFY_EMAIL}
        component={VerifyEmailScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Verify Email')}</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.TWO_FACTOR_AUTH}
        component={TwoFactorAuthentication}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('2-Step Verification')}</HeaderTitle>
          ),
        }}
      />
      <Auth.Screen
        name={AuthScreens.TWO_FACTOR_PAIR}
        component={TwoFactorPairing}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Additional Verification')}</HeaderTitle>
          ),
        }}
      />
      <Auth.Screen
        name={AuthScreens.EMAIL_AUTH}
        component={EmailAuthentication}
        options={{
          headerTitle: () => <HeaderTitle>{t('Check Your Inbox')}</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.FORGOT_PASSWORD}
        component={ForgotPassword}
        options={{
          headerTitle: () => <HeaderTitle>{t('Reset Password')}</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.SECURE_ACCOUNT}
        component={SecureAccount}
        options={{
          headerTitle: () => <HeaderTitle>{t('Account Security')}</HeaderTitle>,
        }}
      />
    </Auth.Group>
  );
};

export default AuthGroup;
