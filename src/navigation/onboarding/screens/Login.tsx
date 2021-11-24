import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import LoginForm from '../../../components/auth/loginForm';
import {RootState} from '../../../store';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {OnboardingStackParamList} from '../OnboardingStack';

type LoginProps = StackScreenProps<OnboardingStackParamList, 'Login'>;

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
      // TODO: navigate to next onboarding step
      // dispatch(successOnboardingStep)
      console.log('TODO: go to next onboarding step');
    }
  }, [loginStatus]);

  const context = route.params?.context || 'login';

  const onSubmit = (email: string, password: string) => {
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
    navigation.replace('Login', {
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
