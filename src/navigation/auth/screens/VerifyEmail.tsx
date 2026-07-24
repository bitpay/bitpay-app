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
import {Link} from '../../../components/styled/Text';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {SumSubEffects, SumSubSelectors} from '../../../store/sumsub';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AuthGroupParamList, AuthScreens} from '../AuthGroup';
import AuthFormContainer, {
  AuthFormParagraph,
} from '../components/AuthFormContainer';
import {
  BackHandler,
  SafeAreaView,
  View,
  ViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
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

const styles = StyleSheet.create({
  verifyEmailParagraph: {
    textAlign: 'center',
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
});

const VerifyEmailParagraph = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <AuthFormParagraph
      ref={ref}
      style={[styles.verifyEmailParagraph, style]}
      {...rest}
    />
  ),
);

const LogoContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.logoContainer, style]} {...rest} />
);

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
  const kycSdkStatus = useAppSelector(SumSubSelectors.selectSdkStatus);
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

  // Like goToPreviousScreen, but routes a KYC-eligible user into VerifyIdentity.
  const goToProfileWithKycCheck = useCallback(async () => {
    if (!onboardingCompleted) {
      goToPreviousScreen();
      return;
    }
    const routes = [
      {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
      {name: BitpayIdScreens.PROFILE, params: {}},
    ];
    const kyc = await dispatch(SumSubEffects.startGetKycStatus());
    // Only called from the isVerified branch, so email is verified here.
    if (SumSubSelectors.isKycEligibleToStart(kyc, kycSdkStatus, true)) {
      routes.push({name: BitpayIdScreens.VERIFY_IDENTITY, params: {}});
    }
    navigation.dispatch(
      CommonActions.reset({index: routes.length - 1, routes}),
    );
  }, [
    dispatch,
    navigation,
    onboardingCompleted,
    goToPreviousScreen,
    kycSdkStatus,
  ]);

  const onPressBackButtonRef = useRef(goToPreviousScreen);
  onPressBackButtonRef.current = goToPreviousScreen;

  const headerLeft = useMemo(() => {
    return () => (
      <TouchableOpacity
        touchableLibrary={'react-native-gesture-handler'}
        testID="cancel-button"
        accessibilityLabel="Go back"
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
        navigation.navigate(AuthScreens.SECURE_ACCOUNT, {context: 'signup'});
      } else {
        goToProfileWithKycCheck();
      }
    }
  }, [
    dispatch,
    navigation,
    isVerified,
    csrfToken,
    email,
    passkeyStatus,
    goToProfileWithKycCheck,
  ]);

  const resendVerificationEmail = () => {
    AuthApi.sendVerificationEmail(network, csrfToken);
  };

  const GoBackLink = () => (
    <Link
      testID="go-back-link-button"
      accessibilityLabel="Go back"
      onPress={() => goToPreviousScreen()}>
      {t('Go Back')}
    </Link>
  );

  return (
    <SafeAreaView testID="verify-email-view">
      <AuthFormContainer testID="verify-email-view">
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
                testID="resend-link-button"
                accessibilityLabel="Resend verification email"
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
