import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {BackHandler, SafeAreaView} from 'react-native';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {CommonActions} from '@react-navigation/native';
import {OnboardingScreens} from '../../../navigation/onboarding/OnboardingGroup';
import AuthApi from '../../../api/auth';
import {
  ActiveOpacity,
  TouchableOpacity,
} from '../../../components/base/TouchableOpacity';
import {IS_ANDROID} from '../../../constants';
import Back from '../../../components/back/Back';
import {ScreenGutter} from '../../../components/styled/Containers';
import Spinner from '../../../components/spinner/Spinner';

const POLL_INTERVAL = 1000 * 15;
const POLL_TIMEOUT = 1000 * 60 * 15;

export type VerifyEmailScreenParamList = {} | undefined;

type VerifyEmailScreenProps = NativeStackScreenProps<
  AuthGroupParamList,
  AuthScreens.VERIFY_EMAIL
>;

const VerifyEmailParagraph = styled(AuthFormParagraph)`
  text-align: center;
  padding: 0 ${ScreenGutter};
`;

const LogoContainer = styled.View`
  align-items: center;
  margin-bottom: 32px;
  width: 100%;
`;

const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const pollId = useRef<ReturnType<typeof setInterval>>(null);
  const pollCountdown = useRef(POLL_TIMEOUT);
  const network = useAppSelector(({APP}) => APP.network);
  const email = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]?.email);
  const isVerified = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.verified,
  );
  const csrfToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.session.csrfToken,
  );
  const passkeyStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.passkeyStatus,
  );
  const isTimedOut = pollCountdown.current <= 0;
  const onboardingCompleted = useAppSelector(
    ({APP}) => APP.onboardingCompleted,
  );
  const [emailVerified, setEmailVerified] = useState(false);

  const goToPreviousScreen = useCallback(() => {
    const routesStack = [];
    if (onboardingCompleted) {
      routesStack.push(
        {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
        {name: BitpayIdScreens.PROFILE, params: {}},
      );
    } else {
      routesStack.push({name: OnboardingScreens.NOTIFICATIONS, params: {}});
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: routesStack,
      }),
    );
  }, [navigation]);

  const onPressBackButtonRef = useRef(goToPreviousScreen);
  onPressBackButtonRef.current = goToPreviousScreen;

  const headerLeft = useMemo(() => {
    return () => (
      <TouchableOpacity
        touchableLibrary={'react-native-gesture-handler'}
        accessibilityLabel="cancel-button"
        style={{marginLeft: IS_ANDROID ? 10 : 0}}
        activeOpacity={ActiveOpacity}
        onPress={onPressBackButtonRef.current}>
        <Back opacity={1} />
      </TouchableOpacity>
    );
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft,
    });
  }, [navigation, headerLeft]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (email && csrfToken) {
      AuthApi.sendVerificationEmail(network, csrfToken);
    }
  }, []);

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

      setEmailVerified(true);
      if (!passkeyStatus) {
        navigation.navigate(AuthScreens.SECURE_ACCOUNT);
      } else {
        goToPreviousScreen();
      }
    }
  }, [dispatch, navigation, isVerified, csrfToken, email, goToPreviousScreen]);

  const resendVerificationEmail = () => {
    AuthApi.sendVerificationEmail(network, csrfToken);
  };

  const GoBackLink = () => (
    <Link
      accessibilityLabel="go-back-link-button"
      onPress={() => goToPreviousScreen()}>
      {t('Go Back')}
    </Link>
  );

  return (
    <SafeAreaView accessibilityLabel="verify-email-view">
      <AuthFormContainer accessibilityLabel="verify-email-view">
        <LogoContainer>
          <Spinner size={78} />
        </LogoContainer>
        {isTimedOut && (
          <VerifyEmailParagraph>
            {t("Didn't get an email? Try logging in again later.")}{' '}
            <GoBackLink />
          </VerifyEmailParagraph>
        )}

        {!isTimedOut && !emailVerified && (
          <>
            <VerifyEmailParagraph>
              {t(
                `We sent a verification email to ${email}. Open the link inside to continue.`,
                {
                  email: email || t('your email address'),
                },
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
    </SafeAreaView>
  );
};

export default VerifyEmailScreen;
