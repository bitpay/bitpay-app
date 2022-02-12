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
import LoginSignup, {LoginSignupParamList} from './screens/LoginSignup';
import TwoFactorAuthentication, {
  TwoFactorAuthenticationParamList,
} from './screens/TwoFactor.Auth';
import EmailAuthentication, {
  EmailAuthenticationParamList,
} from './screens/TwoFactor.Email';
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
  LoginSignup: LoginSignupParamList;
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
      initialRouteName={AuthScreens.LOGIN_SIGNUP}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Auth.Screen
        name={AuthScreens.LOGIN_SIGNUP}
        component={LoginSignup}
        options={({route}) => ({
          headerTitle: () => {
            // making a const cause inline is crashing for some reason
            const isLogin = route.params.context === 'login';

            return (
              <HeaderTitle>
                {isLogin ? 'Welcome Back!' : 'Create Account'}
              </HeaderTitle>
            );
          },
        })}
      />
      {isTwoFactorPending && (
        <>
          <Auth.Screen
            name={AuthScreens.TWO_FACTOR_AUTH}
            component={TwoFactorAuthentication}
            options={{
              headerTitle: '2-Step Verification',
            }}
          />
          <Auth.Screen
            name={AuthScreens.TWO_FACTOR_PAIR}
            component={TwoFactorPairing}
            options={{
              headerTitle: 'Additional Verification',
            }}
          />
        </>
      )}
      {isEmailAuthPending && (
        <Auth.Screen
          name={AuthScreens.EMAIL_AUTH}
          component={EmailAuthentication}
          options={{
            headerTitle: 'Check Your Inbox',
          }}
        />
      )}
    </Auth.Navigator>
  );
};

export default AuthStack;
