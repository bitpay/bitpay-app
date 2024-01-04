import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Spinner from '../../../components/spinner/Spinner';
import {
  TWO_FACTOR_EMAIL_POLL_INTERVAL,
  TWO_FACTOR_EMAIL_POLL_TIMEOUT,
} from '../../../constants/config';
import {navigationRef} from '../../../Root';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AuthGroupParamList} from '../AuthGroup';
import AuthFormContainer, {
  AuthFormParagraph,
} from '../components/AuthFormContainer';

export type EmailAuthenticationParamList =
  | {
      onLoginSuccess?: ((...args: any[]) => any) | undefined;
    }
  | undefined;

type EmailAuthenticationScreenProps = NativeStackScreenProps<
  AuthGroupParamList,
  'EmailAuthentication'
>;

const SpinnerWrapper = styled.View`
  align-items: center;
  margin-bottom: 32px;
`;

const EmailAuthentication: React.FC<EmailAuthenticationScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {onLoginSuccess} = route.params || {};
  const pollId = useRef<ReturnType<typeof setInterval>>();
  const pollCountdown = useRef(TWO_FACTOR_EMAIL_POLL_TIMEOUT);
  const isAuthenticated = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.isAuthenticated,
  );
  const csrfToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.csrfToken,
  );
  const emailPairingStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.emailPairingStatus,
  );
  const isTimedOut = pollCountdown.current <= 0;

  // start polling session until authenticated
  useEffect(() => {
    pollId.current = setInterval(() => {
      dispatch(BitPayIdEffects.startFetchSession());
      pollCountdown.current -= TWO_FACTOR_EMAIL_POLL_INTERVAL;
    }, TWO_FACTOR_EMAIL_POLL_INTERVAL);

    return () => {
      dispatch(BitPayIdActions.updateLoginStatus(null));
      dispatch(BitPayIdActions.updateEmailPairingStatus(null));

      if (pollId.current) {
        clearInterval(pollId.current);
      }
    };
  }, [dispatch]);

  // check poll timeout
  // intentionally not using setTimeout due to device constraints regarding long timers
  useEffect(() => {
    if (isTimedOut && pollId.current) {
      clearInterval(pollId.current);
    }
  }, [isTimedOut]);

  // check poll result
  useEffect(() => {
    if (isAuthenticated) {
      if (pollId.current) {
        clearInterval(pollId.current);
      }

      dispatch(BitPayIdEffects.startEmailPairing(csrfToken));
    }
  }, [isAuthenticated, csrfToken, navigation, dispatch]);

  useEffect(() => {
    switch (emailPairingStatus) {
      case 'success':
        dispatch(BitPayIdActions.completedPairing());
        if (onLoginSuccess) {
          onLoginSuccess();
          return;
        }

        const navParent = navigation.getParent();

        if (navParent?.canGoBack()) {
          navParent.goBack();
        } else {
          navigationRef.navigate('BitPayIdProfile');
        }

        return;

      case 'failed':
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'error',
            title: t('Login failed'),
            message: t('Something went wrong while authenticating.'),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  navigation.navigate('Login');
                },
              },
            ],
          }),
        );
        return;
    }
  }, [emailPairingStatus, navigation, dispatch, t, onLoginSuccess]);

  return (
    <AuthFormContainer>
      {isTimedOut && (
        <>
          <AuthFormParagraph>
            {t("Didn't get an email? Try logging in again later.")}
          </AuthFormParagraph>
        </>
      )}

      {!isTimedOut && (
        <>
          <SpinnerWrapper>
            <Spinner size={78} />
          </SpinnerWrapper>

          <AuthFormParagraph>
            {t(
              'We sent an email containing a link to authenticate this login attempt.',
            )}
          </AuthFormParagraph>
        </>
      )}
    </AuthFormContainer>
  );
};

export default EmailAuthentication;
