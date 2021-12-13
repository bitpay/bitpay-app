import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import LoginForm from '../../../components/auth/loginForm';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {OnboardingStackParamList} from '../OnboardingStack';
import {Keyboard} from 'react-native';

type LoginProps = StackScreenProps<OnboardingStackParamList, 'LoginSignup'>;

export const LoginScreen: React.FC<LoginProps> = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {session, loginStatus} = useSelector(
    ({BITPAY_ID}: RootState) => BITPAY_ID,
  );

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
  }, [dispatch]);

  useEffect(() => {
    if (loginStatus === 'success') {
      navigation.navigate('Notifications');
      dispatch(BitPayIdActions.updateLoginStatus(null));
    }
  }, [loginStatus, navigation, dispatch]);

  const context = route.params?.context || 'login';

  const onSubmit = (email: string, password: string) => {
    Keyboard.dismiss();
    if (!session || !session.csrfToken) {
      console.log('CSRF token not found.');
      return;
    }

    const credentials = {email, password};
    const action =
      context === 'login'
        ? BitPayIdEffects.startLogin(credentials)
        : BitPayIdEffects.startCreateAccount(credentials);
    dispatch(action);
  };

  const onAlreadyHaveAccount = () => {
    navigation.replace('LoginSignup', {
      context: 'login',
    });
  };

  const onTroubleLoggingIn = () => {
    // TODO: reset password
    // if stateless, can move this to component
    console.log('TODO: reset password');
  };

  return (
    <LoginForm
      context={context}
      onSubmit={({email, password}) => onSubmit(email, password)}
      onAlreadyHaveAccount={onAlreadyHaveAccount}
      onTroubleLoggingIn={onTroubleLoggingIn}
    />
  );
};

export default LoginScreen;
