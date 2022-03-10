import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import {RootState} from '../../store';
import {BitPayIdActions} from '../../store/bitpay-id';
import {LoginStatus} from '../../store/bitpay-id/bitpay-id.reducer';
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

export enum AuthScreens {
  LOGIN = 'Login',
  CREATE_ACCOUNT = 'CreateAccount',
  VERIFY_EMAIL = 'VerifyEmail',
  EMAIL_AUTH = 'EmailAuthentication',
  TWO_FACTOR_AUTH = 'TwoFactorAuthentication',
  TWO_FACTOR_PAIR = 'TwoFactorPairing',
}

export type AuthStackParamList = {
  Login: LoginScreenParamList;
  CreateAccount: CreateAccountScreenParamList;
  VerifyEmail: VerifyEmailScreenParamList;
  EmailAuthentication: EmailAuthenticationParamList;
  TwoFactorAuthentication: TwoFactorAuthenticationParamList;
  TwoFactorPairing: TwoFactorPairingParamList;
};

const Auth = createStackNavigator<AuthStackParamList>();
const AuthStack: React.FC = () => {
  const dispatch = useDispatch();
  const loginStatus = useSelector<RootState, LoginStatus>(
    ({BITPAY_ID}) => BITPAY_ID.loginStatus,
  );
  const isTwoFactorPending = loginStatus === 'twoFactorPending';
  const isEmailAuthPending = loginStatus === 'emailAuthenticationPending';

  useEffect(() => {
    return () => {
      dispatch(BitPayIdActions.resetAuthStack());
    };
  }, [dispatch]);

  return (
    <Auth.Navigator
      initialRouteName={AuthScreens.LOGIN}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Auth.Screen
        name={AuthScreens.LOGIN}
        component={LoginScreen}
        options={{
          headerTitle: () => <HeaderTitle>Welcome Back!</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.CREATE_ACCOUNT}
        component={CreateAccountScreen}
        options={{
          headerTitle: () => <HeaderTitle>Create Account</HeaderTitle>,
        }}
      />
      <Auth.Screen
        name={AuthScreens.VERIFY_EMAIL}
        component={VerifyEmailScreen}
        options={{
          headerTitle: () => <HeaderTitle>Check Your Inbox</HeaderTitle>,
        }}
      />
      {isTwoFactorPending && (
        <>
          <Auth.Screen
            name={AuthScreens.TWO_FACTOR_AUTH}
            component={TwoFactorAuthentication}
            options={{
              headerTitle: () => <HeaderTitle>2-Step Verification</HeaderTitle>,
            }}
          />
          <Auth.Screen
            name={AuthScreens.TWO_FACTOR_PAIR}
            component={TwoFactorPairing}
            options={{
              headerTitle: () => (
                <HeaderTitle>Additional Verification</HeaderTitle>
              ),
            }}
          />
        </>
      )}
      {isEmailAuthPending && (
        <Auth.Screen
          name={AuthScreens.EMAIL_AUTH}
          component={EmailAuthentication}
          options={{
            headerTitle: () => <HeaderTitle>Check Your Inbox</HeaderTitle>,
          }}
        />
      )}
    </Auth.Navigator>
  );
};

export default AuthStack;
