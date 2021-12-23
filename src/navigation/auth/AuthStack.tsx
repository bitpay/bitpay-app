import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import EmailAuthentication, {
  EmailAuthenticationParamList,
} from './screens/TwoFactor.Email';
import TwoFactorAuthentication, {
  TwoFactorAuthenticationParamList,
} from './screens/TwoFactor.Auth';
import LoginSignup, {LoginSignupParamList} from './screens/LoginSignup';
import {NavigationProp} from '@react-navigation/core';
import {useSelector} from 'react-redux';
import {RootState} from '../../store';
import {LoginStatus} from '../../store/bitpay-id/bitpay-id.reducer';
import TwoFactorPairing, {
  TwoFactorPairingParamList,
} from './screens/TwoFactor.Pair';

export enum AuthScreens {
  LOGIN_SIGNUP = 'LoginSignup',
  EMAIL_AUTH = 'EmailAuthentication',
  TWO_FACTOR_AUTH = 'TwoFactorAuthentication',
  TWO_FACTOR_PAIR = 'TwoFactorPairing',
}

export type AuthStackParamList = {
  LoginSignup: LoginSignupParamList | undefined;
  EmailAuthentication: EmailAuthenticationParamList | undefined;
  TwoFactorAuthentication: TwoFactorAuthenticationParamList | undefined;
  TwoFactorPairing: TwoFactorPairingParamList | undefined;
};

export type AuthStackNavigationProp = NavigationProp<AuthStackParamList>;

const Auth = createStackNavigator<AuthStackParamList>();
const AuthStack = () => {
  const loginStatus = useSelector<RootState, LoginStatus>(
    ({BITPAY_ID}) => BITPAY_ID.loginStatus,
  );
  const isTwoFactorPending = loginStatus === 'twoFactorPending';
  const isEmailAuthPending = loginStatus === 'emailAuthenticationPending';

  return (
    <Auth.Navigator
      initialRouteName={AuthScreens.LOGIN_SIGNUP}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Auth.Screen name={AuthScreens.LOGIN_SIGNUP} component={LoginSignup} />
      {isTwoFactorPending && (
        <>
          <Auth.Screen
            name={AuthScreens.TWO_FACTOR_AUTH}
            component={TwoFactorAuthentication}
          />
          <Auth.Screen
            name={AuthScreens.TWO_FACTOR_PAIR}
            component={TwoFactorPairing}
          />
        </>
      )}
      {isEmailAuthPending && (
        <Auth.Screen
          name={AuthScreens.EMAIL_AUTH}
          component={EmailAuthentication}
        />
      )}
    </Auth.Navigator>
  );
};

export default AuthStack;
