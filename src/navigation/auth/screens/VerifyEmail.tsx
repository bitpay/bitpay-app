import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {Link} from '../../../components/styled/Text';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AuthGroupParamList, AuthScreens} from '../AuthGroup';
import AuthFormContainer, {
  AuthFormParagraph,
} from '../components/AuthFormContainer';

const POLL_INTERVAL = 1000 * 3;
const POLL_TIMEOUT = 1000 * 60 * 5;

export type VerifyEmailScreenParamList = {} | undefined;

type VerifyEmailScreenProps = NativeStackScreenProps<
  AuthGroupParamList,
  AuthScreens.VERIFY_EMAIL
>;

const VerifyEmailParagraph = styled(AuthFormParagraph)`
  text-align: center;
`;

const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const pollId = useRef<ReturnType<typeof setInterval>>();
  const pollCountdown = useRef(POLL_TIMEOUT);
  const email = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network]?.email,
  );
  const isVerified = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.verified,
  );
  const csrfToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.csrfToken,
  );
  const isTimedOut = pollCountdown.current <= 0;

  useEffect(() => {
    if (!email || !csrfToken) {
      navigation.navigate('Login');
    } else {
      dispatch(BitPayIdEffects.startSendVerificationEmail());
    }
  }, [email, csrfToken, navigation, dispatch]);

  // start polling session until verified
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
    if (isVerified) {
      if (pollId.current) {
        clearInterval(pollId.current);
      }

      dispatch(
        Analytics.track('Verified Email', {
          email: email || '',
        }),
      );

      navigation.navigate('CreateAccount');
    }
  }, [dispatch, navigation, isVerified, csrfToken, email]);

  const resendVerificationEmail = () => {
    dispatch(BitPayIdEffects.startSendVerificationEmail());
  };

  return (
    <AuthFormContainer accessibilityLabel="verify-email-view">
      {isTimedOut && (
        <VerifyEmailParagraph>
          {t("Didn't get an email? Try logging in again later.")}
        </VerifyEmailParagraph>
      )}

      {!isTimedOut && (
        <>
          <VerifyEmailParagraph>
            {t(
              'We sent a verification email to. Open the link inside to continue.',
              {email: email || t('your email address')},
            )}
          </VerifyEmailParagraph>

          <VerifyEmailParagraph>
            {t("Email didn't arrive?")}{' '}
            <Link
              accessibilityLabel="resend-link-button"
              onPress={() => resendVerificationEmail()}>
              {t('Resend link')}
            </Link>
          </VerifyEmailParagraph>
        </>
      )}
    </AuthFormContainer>
  );
};

export default VerifyEmailScreen;
