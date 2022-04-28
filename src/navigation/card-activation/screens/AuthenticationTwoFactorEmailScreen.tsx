import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect, useRef} from 'react';
import {useDispatch} from 'react-redux';
import {
  TWO_FACTOR_EMAIL_POLL_INTERVAL,
  TWO_FACTOR_EMAIL_POLL_TIMEOUT,
} from '../../../constants/config';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {Card} from '../../../store/card/card.models';
import {useAppSelector} from '../../../utils/hooks';
import AuthFormContainer, {
  AuthFormParagraph,
} from '../../auth/components/AuthFormContainer';
import {CardActivationStackParamList} from '../CardActivationStack';

export type TwoFactorEmailScreenParamList = {
  card: Card;
};

const AuthenticationTwoFactorEmailScreen: React.FC<
  StackScreenProps<CardActivationStackParamList, 'TwoFactorEmail'>
> = ({navigation, route}) => {
  const dispatch = useDispatch();
  const pollId = useRef<ReturnType<typeof setInterval>>();
  const pollCountdown = useRef(TWO_FACTOR_EMAIL_POLL_TIMEOUT);
  const isAuthenticated = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.isAuthenticated,
  );
  const csrfToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.csrfToken,
  );
  const isTimedOut = pollCountdown.current <= 0;

  // start polling session until authenticated
  useEffect(() => {
    pollId.current = setInterval(() => {
      dispatch(BitPayIdEffects.startFetchSession());
      pollCountdown.current -= TWO_FACTOR_EMAIL_POLL_INTERVAL;
    }, TWO_FACTOR_EMAIL_POLL_INTERVAL);

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

      navigation.replace('Activate', {
        card: route.params.card,
      });
    }
  }, [isAuthenticated, csrfToken, navigation, dispatch]);

  return (
    <AuthFormContainer>
      {isTimedOut ? (
        <AuthFormParagraph>
          Didn't get an email? Try logging in again later.
        </AuthFormParagraph>
      ) : (
        <AuthFormParagraph>
          We sent an email containing a link to authenticate this login attempt.
        </AuthFormParagraph>
      )}
    </AuthFormContainer>
  );
};

export default AuthenticationTwoFactorEmailScreen;
