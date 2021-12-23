import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import LoginForm from '../../../components/auth/loginForm';
import {navigationRef, RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {updateLoginStatus} from '../../../store/bitpay-id/bitpay-id.actions';
import {LoginStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdStack';
import {AuthStackParamList} from '../AuthStack';

export type LoginSignupParamList = {
  context: 'login' | 'signup';
};

type LoginSignupProps = LoginSignupParamList &
  StackScreenProps<AuthStackParamList, 'LoginSignup'>;

const LoginSignup: React.FC<LoginSignupProps> = ({navigation}) => {
  const dispatch = useDispatch();
  const loginStatus = useSelector<RootState, LoginStatus>(
    ({BITPAY_ID}) => BITPAY_ID.loginStatus,
  );

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      dispatch(BitPayIdActions.completedPairing());

      const parentNav = navigation.getParent();

      if (parentNav?.canGoBack()) {
        parentNav.goBack();
      } else {
        navigationRef.navigate(RootStacks.BITPAY_ID, {
          screen: BitpayIdScreens.PROFILE,
        });
      }

      dispatch(updateLoginStatus(null));
      return;
    }

    if (loginStatus === 'failed') {
      console.log('oh man login failed');
      return;
    }

    if (loginStatus === 'twoFactorPending') {
      navigation.navigate('TwoFactorAuthentication');
      return;
    }

    if (loginStatus === 'emailAuthenticationPending') {
      navigation.navigate('EmailAuthentication');
      return;
    }
  }, [loginStatus, navigation, dispatch]);

  const onSubmit = ({email, password}: {email: string; password: string}) => {
    dispatch(BitPayIdEffects.startLogin({email, password}));
  };

  const onAlreadyHaveAccount = () => {
    console.log('already have account');
  };

  const onTroubleLoggingIn = () => {
    console.log('trouble logging in');
  };

  return (
    <LoginForm
      context={'login'}
      onSubmit={onSubmit}
      onAlreadyHaveAccount={onAlreadyHaveAccount}
      onTroubleLoggingIn={onTroubleLoggingIn}
    />
  );
};

export default LoginSignup;
