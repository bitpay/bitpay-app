import React, {useLayoutEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {
  SafeAreaView,
  ScrollView as RNScrollView,
  View,
  ViewProps,
  ScrollViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import {
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../components/styled/Text';
import {Action, LightBlue, Slate30, SlateDark} from '../../../styles/colors';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {AuthGroupParamList, AuthScreens} from '../AuthGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import PasskeyPersonSetupIcon from '../../../../assets/img/passkey-person-setup.svg';
import PasskeyPersonSetupIconDark from '../../../../assets/img/passkey-person-setup-dark.svg';
import TwoFactorIcon from '../../../../assets/img/two-factor-icon.svg';
import TwoFactorIconDark from '../../../../assets/img/two-factor-icon-dark.svg';
import ChevronRight from '../../bitpay-id/components/ChevronRight';
import Button from '../../../components/button/Button';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {OnboardingScreens} from '../../onboarding/OnboardingGroup';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import {getPasskeyCredentials, registerPasskey} from '../../../utils/passkey';
import {Session} from '../../../store/bitpay-id/bitpay-id.models';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {
  setPasskeyCredentials,
  setPasskeyStatus,
} from '../../../store/bitpay-id/bitpay-id.actions';
import {useOngoingProcess} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';
import {SumSubEffects, SumSubSelectors} from '../../../store/sumsub';

const styles = StyleSheet.create({
  accountSecurityScreenContainer: {
    flex: 1,
  },
  scrollView: {
    marginHorizontal: parseInt(ScreenGutter, 10),
    paddingBottom: 100,
  },
  headerTextContainer: {
    marginVertical: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  cardPressable: {
    padding: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexGrow: 1,
    marginLeft: 16,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bullets: {
    display: 'flex',
    width: '80%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 16,
    lineHeight: 20,
  },
  chevron: {
    marginLeft: 10,
    paddingTop: 2,
  },
});

const AccountSecurityScreenContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView
    style={[styles.accountSecurityScreenContainer, style]}
    {...rest}
  />
);

const ScrollView = ({style, ...rest}: ScrollViewProps) => (
  <RNScrollView style={[styles.scrollView, style]} {...rest} />
);

const HeaderTextContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.headerTextContainer, style]} {...rest} />
);

const HeaderText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <Paragraph ref={ref} style={[styles.headerText, style]} {...rest} />
  ),
);

const CardPressable: React.FC<TouchableOpacityProps> = ({style, ...rest}) => {
  const {dark} = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.cardPressable,
        {borderColor: dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const CardTitleContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.cardTitleContainer, style]} {...rest} />
);

const IconBadge = ({style, ...rest}: ViewProps) => {
  const {dark} = useTheme();
  return (
    <View
      style={[
        styles.iconBadge,
        {backgroundColor: dark ? 'rgba(34, 64, 196, 0.25)' : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const CardContent = ({style, ...rest}: ViewProps) => (
  <View style={[styles.cardContent, style]} {...rest} />
);

const TitleContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.titleContainer, style]} {...rest} />
);

const TitleText = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.titleText, style]} {...rest} />
));

const Bullets = ({style, ...rest}: ViewProps) => (
  <View style={[styles.bullets, style]} {...rest} />
);

const BulletRow = ({style, ...rest}: ViewProps) => (
  <View style={[styles.bulletRow, style]} {...rest} />
);

const Dot = ({style, ...rest}: ViewProps) => {
  const {dark} = useTheme();
  return (
    <View
      style={[styles.dot, {backgroundColor: dark ? '#4989FF' : Action}, style]}
      {...rest}
    />
  );
};

const BulletText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.bulletText, style]} {...rest} />
  ),
);

const Chevron = ({style, ...rest}: ViewProps) => (
  <View style={[styles.chevron, style]} {...rest} />
);

export const SecureAccountScreen = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {dark} = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AuthGroupParamList, AuthScreens.SECURE_ACCOUNT>>();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const network = useAppSelector(({APP}) => APP.network);
  const session: Session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const onboardingCompleted = useAppSelector(
    ({APP}) => APP.onboardingCompleted,
  );
  const kycSdkStatus = useAppSelector(SumSubSelectors.selectSdkStatus);

  const onSkipPressRef = useRef(async () => {
    if (!onboardingCompleted) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: OnboardingScreens.NOTIFICATIONS, params: {}}],
        }),
      );
      return;
    }

    const context = route.params?.context;
    const routes: {name: string; params: object}[] = [
      {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
    ];

    // Login just lands on Home; the Get Verified modal is handled there.
    // Signup (reached post-email-verification) walks an eligible user through
    // VerifyIdentity after the passkey step.
    if (context !== 'login') {
      routes.push({name: BitpayIdScreens.PROFILE, params: {}});
      const kyc = await dispatch(SumSubEffects.startGetKycStatus());
      if (SumSubSelectors.isKycEligibleToStart(kyc, kycSdkStatus, true)) {
        routes.push({name: BitpayIdScreens.VERIFY_IDENTITY, params: {}});
      }
    }

    navigation.dispatch(
      CommonActions.reset({index: routes.length - 1, routes}),
    );
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            testID="skip-button"
            accessibilityLabel="Skip"
            buttonType={'pill'}
            onPress={onSkipPressRef.current}>
            {t('Skip')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  const goToPasskeySetup = async () => {
    if (!user) {
      return;
    }
    showOngoingProcess('CREATING_PASSKEY');
    try {
      const registeredPasskey = await registerPasskey(
        user.email,
        network,
        session.csrfToken,
      );
      logManager.info(
        '[Onboarding] Passkey created: ',
        JSON.stringify(registeredPasskey),
      );
      dispatch(setPasskeyStatus(registeredPasskey));
      const {credentials} = await getPasskeyCredentials(
        user.email,
        network,
        session.csrfToken,
      );
      dispatch(setPasskeyCredentials(credentials));
      hideOngoingProcess();
      if (registeredPasskey) {
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Passkey created'),
            message: t('Your account is secure.'),
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('Continue'),
                action: () => {
                  onSkipPressRef.current();
                },
              },
            ],
          }),
        );
      } else {
        dispatch(
          showBottomNotificationModal({
            type: 'error',
            title: t('Error creating passkey'),
            message: t('Could not create a passkey, please try again later.'),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('Continue'),
                action: () => {
                  onSkipPressRef.current();
                },
              },
            ],
          }),
        );
      }
    } catch (e: any) {
      hideOngoingProcess();
      const eMsg = e.message || JSON.stringify(e);
      logManager.error('[Onboarding] Error creating passkey: ', eMsg);
      if (e.error !== 'UserCancelled' && !eMsg.includes('error 1001')) {
        dispatch(
          showBottomNotificationModal({
            type: 'error',
            title: t('Error creating passkey'),
            message: eMsg,
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('OK'),
                action: () => {},
              },
            ],
          }),
        );
      }
    }
  };

  const goToTwoFactorSetup = () => {
    navigation.navigate(BitpayIdScreens.ENABLE_TWO_FACTOR);
  };

  return (
    <AccountSecurityScreenContainer>
      <ScrollView>
        <HeaderTextContainer>
          <HeaderText>
            {t(
              'To keep your account secure, choose how you want to sign in. You can always update your preferences later.',
            )}
          </HeaderText>
        </HeaderTextContainer>
        <CardPressable
          testID="secure-account-setup-passkey-button"
          accessibilityLabel="Set up a passkey"
          onPress={goToPasskeySetup}>
          <CardTitleContainer>
            <IconBadge>
              {dark ? (
                <PasskeyPersonSetupIconDark width={20} height={20} />
              ) : (
                <PasskeyPersonSetupIcon width={20} height={20} />
              )}
            </IconBadge>
            <TitleContainer>
              <TitleText numberOfLines={2}>
                Set Up a Passkey (Recommended)
              </TitleText>
            </TitleContainer>
          </CardTitleContainer>

          <CardContent>
            <Bullets>
              <BulletRow>
                <Dot />
                <BulletText>
                  Sign in with Face ID, Touch ID, or a security key
                </BulletText>
              </BulletRow>
              <BulletRow>
                <Dot />
                <BulletText>
                  No passwords needed for a faster, safer login
                </BulletText>
              </BulletRow>
            </Bullets>
            <Chevron>
              <ChevronRight />
            </Chevron>
          </CardContent>
        </CardPressable>

        <CardPressable
          testID="secure-account-setup-two-factor-button"
          accessibilityLabel="Set up two-factor authentication"
          onPress={goToTwoFactorSetup}>
          <CardTitleContainer>
            <IconBadge>
              {dark ? (
                <TwoFactorIconDark width={20} height={20} />
              ) : (
                <TwoFactorIcon width={20} height={20} />
              )}
            </IconBadge>
            <TitleContainer>
              <TitleText numberOfLines={2}>
                Set Up 2-Factor Authentication
              </TitleText>
            </TitleContainer>
          </CardTitleContainer>

          <CardContent>
            <Bullets>
              <BulletRow>
                <Dot />
                <BulletText>
                  Use an Authenticator app or SMS verification
                </BulletText>
              </BulletRow>
              <BulletRow>
                <Dot />
                <BulletText>
                  Adds an extra layer of security to your password
                </BulletText>
              </BulletRow>
            </Bullets>
            <Chevron>
              <ChevronRight />
            </Chevron>
          </CardContent>
        </CardPressable>
      </ScrollView>
    </AccountSecurityScreenContainer>
  );
};

export default SecureAccountScreen;
