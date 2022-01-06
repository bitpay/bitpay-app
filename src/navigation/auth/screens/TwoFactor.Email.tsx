import {useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Network} from '../../../constants';
import {navigationRef} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {EmailPairingStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {AuthStackParamList} from '../AuthStack';
import AuthFormContainer, {
  AuthFormParagraph,
} from '../components/AuthFormContainer';

export type EmailAuthenticationParamList = {} | undefined;

type EmailAuthenticationScreenProps = StackScreenProps<
  AuthStackParamList,
  'EmailAuthentication'
>;

const POLL_INTERVAL = 1000 * 3;
const POLL_TIMEOUT = 1000 * 60 * 5;

const EmailAuthentication: React.FC<EmailAuthenticationScreenProps> = ({
  navigation,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const pollId = useRef<ReturnType<typeof setInterval>>();
  const pollCountdown = useRef(POLL_TIMEOUT);
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const isAuthenticated = useSelector<RootState, boolean>(
    ({BITPAY_ID}) => BITPAY_ID.session.isAuthenticated,
  );
  const csrfToken = useSelector<RootState, string>(
    ({BITPAY_ID}) => BITPAY_ID.session.csrfToken,
  );
  const emailPairingStatus = useSelector<RootState, EmailPairingStatus>(
    ({BITPAY_ID}) => BITPAY_ID.emailPairingStatus,
  );
  const isTimedOut = pollCountdown.current <= 0;

  // start polling session until authenticated
  useEffect(() => {
    pollId.current = setInterval(() => {
      dispatch(BitPayIdEffects.startFetchSession());
      pollCountdown.current -= POLL_INTERVAL;
    }, POLL_INTERVAL);

    return () => {
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

      dispatch(BitPayIdEffects.startEmailPairing(network, csrfToken));
    }
  }, [isAuthenticated, csrfToken, navigation, network, dispatch]);

  useEffect(() => {
    switch (emailPairingStatus) {
      case 'success':
        dispatch(BitPayIdActions.completedPairing());

        const navParent = navigation.getParent();

        if (navParent?.canGoBack()) {
          navParent.goBack();
        } else {
          navigationRef.navigate('BitpayId', {
            screen: 'Profile',
          });
        }

        return;

      case 'failed':
        console.error('Pairing failed.');
        return;
    }
  }, [emailPairingStatus, navigation, dispatch]);

  return (
    <AuthFormContainer theme={theme} header="Check Your Inbox">
      {isTimedOut && (
        <>
          <AuthFormParagraph>
            Didn't get an email? Try logging in again later.
          </AuthFormParagraph>
        </>
      )}

      {!isTimedOut &&
        (emailPairingStatus === 'failed' ? (
          <>
            <AuthFormParagraph>
              Something went wrong while authenticating.
            </AuthFormParagraph>
          </>
        ) : (
          <>
            <AuthFormParagraph>
              We sent an email containing a link to authenticate this login
              attempt.
            </AuthFormParagraph>
          </>
        ))}
    </AuthFormContainer>
  );
};

export default EmailAuthentication;
