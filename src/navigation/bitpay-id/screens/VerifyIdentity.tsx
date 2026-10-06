import React, {useEffect, useState} from 'react';
import {SvgProps} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import type {TFunction} from 'i18next';
import {
  ScrollView as RNScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../../contexts';
import {H2, H3, Paragraph} from '../../../components/styled/Text';
import Button, {ButtonState} from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  Caution25,
  Success25,
  Warning25,
  SlateDark,
  NeutralSlate,
  LightBlack,
  LightBlue,
} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {SumSubEffects, SumSubSelectors} from '../../../store/sumsub';
import {KycUiState} from '../../../store/sumsub/sumsub.selectors';
import {navigationRef, RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import IconKycStatusVerified from '../../../../assets/img/kyc_status_verified.svg';
import IconKycStatusPending from '../../../../assets/img/kyc_status_pending.svg';
import IconKycStatusDenied from '../../../../assets/img/kyc_status_denied.svg';
import IconKycGetVerified from '../../../../assets/img/kyc_get_verified.svg';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 0,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  iconStatus: {
    marginBottom: 8,
  },
  title: {
    textAlign: 'left',
  },
  body: {
    textAlign: 'left',
    fontWeight: '400',
  },
  buttonContainer: {
    marginTop: 32,
  },
  getVerifiedTitle: {
    fontSize: 31,
    lineHeight: 38,
    textAlign: 'left',
    fontWeight: '700',
    marginBottom: 32,
  },
  illustrationContainer: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});

const Container = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.container, style]} {...rest} />
);

// flexGrow keeps the status states' button pinned to the bottom when the
// content is shorter than the viewport
const ScrollContainer = ({style, ...rest}: ScrollViewProps) => (
  <RNScrollView
    style={[styles.scrollContainer, style]}
    contentContainerStyle={styles.scrollContent}
    {...rest}
  />
);

const Content = ({style, ...rest}: ViewProps) => (
  <View style={[styles.content, style]} {...rest} />
);

const IconStatus = ({style, ...rest}: ViewProps) => (
  <View style={[styles.iconStatus, style]} {...rest} />
);

const Title = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <H3 ref={ref} style={[styles.title, style]} {...rest} />
));

const Body = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Paragraph
      ref={ref}
      style={[
        styles.body,
        {color: theme.dark ? NeutralSlate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});

const ButtonContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.buttonContainer, style]} {...rest} />
);

const GetVerifiedTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <H2 ref={ref} style={[styles.getVerifiedTitle, style]} {...rest} />
  ),
);

const IllustrationContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.illustrationContainer,
        {backgroundColor: theme.dark ? LightBlack : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

// notStarted renders onboarding; every other state uses STATE_CONFIG below.
type KycStateConfig = {
  icon: React.FC<SvgProps>;
  iconBg: string;
  getTitle: (t: TFunction) => string;
  getBody: (t: TFunction) => string;
};

const STATE_CONFIG: Record<
  Exclude<KycUiState, 'notStarted'>,
  KycStateConfig
> = {
  inProgress: {
    icon: IconKycStatusPending,
    iconBg: Warning25,
    getTitle: t => t('Finish verifying your identity'),
    getBody: t =>
      t(
        'You have a verification in progress. Click the button below to pick up where you left off.',
      ),
  },
  actionRequired: {
    icon: IconKycStatusDenied,
    iconBg: Caution25,
    getTitle: t => t('Action required on your application'),
    getBody: t => t('Click the button below to resume your application.'),
  },
  denied: {
    icon: IconKycStatusDenied,
    iconBg: Caution25,
    getTitle: t => t('Application Denied'),
    getBody: t =>
      t(
        'Your account was denied. You will not be able to use BitPay products or services.',
      ),
  },
  inReview: {
    icon: IconKycStatusPending,
    iconBg: Warning25,
    getTitle: t => t('Application in Review'),
    getBody: t =>
      t(
        'Your application is in review, please wait for an email to get your updated status.',
      ),
  },
  success: {
    icon: IconKycStatusVerified,
    iconBg: Success25,
    getTitle: t => t('Application Success'),
    getBody: t =>
      t(
        'Your account was approved! You may now continue to use BitPay products and services.',
      ),
  },
};

const goHome = () => {
  navigationRef.navigate(RootStacks.TABS, {screen: TabsScreens.HOME});
};

export const VerifyIdentityScreen: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const state = useAppSelector(SumSubSelectors.selectKycUiState);

  // Refresh the authoritative status from the backend when the screen opens.
  useEffect(() => {
    if (user) {
      dispatch(SumSubEffects.startGetKycStatus());
    }
  }, [dispatch, user]);

  // Without the ongoing process modal there is nothing suppressing input while
  // the token is minted; a loading state keeps a second tap from opening a
  // second attempt (RN-2906).
  const [buttonState, setButtonState] = useState<ButtonState>(null);

  const handleResume = async () => {
    setButtonState('loading');
    try {
      await dispatch(SumSubEffects.startKycVerification());
    } finally {
      setButtonState(null);
    }
  };

  if (state === 'notStarted') {
    return (
      <Container>
        <ScrollContainer>
          <GetVerifiedTitle>{t('Get verified')}</GetVerifiedTitle>
          <IllustrationContainer>
            <IconKycGetVerified width={214} height={217} />
          </IllustrationContainer>
          <Body>
            {t(
              "To keep your account secure and compliant, we'll need to collect a few additional pieces of information. These quick steps help protect your funds, enable payments, and meet regulatory requirements.",
            )}
          </Body>

          <ButtonContainer>
            <Button state={buttonState} onPress={handleResume}>
              {t('Verify My Identity')}
            </Button>
          </ButtonContainer>
        </ScrollContainer>
      </Container>
    );
  }

  const {icon: Icon, getTitle, getBody} = STATE_CONFIG[state];

  return (
    <Container>
      <ScrollContainer>
        <Content>
          <IconStatus>{Icon && <Icon />}</IconStatus>
          <Title>{getTitle(t)}</Title>
          <Body>{getBody(t)}</Body>
        </Content>

        <ButtonContainer>
          {state === 'inProgress' ? (
            <Button state={buttonState} onPress={handleResume}>
              {t('Continue Verification')}
            </Button>
          ) : state === 'actionRequired' ? (
            <Button state={buttonState} onPress={handleResume}>
              {t('Resume Application')}
            </Button>
          ) : (
            <Button onPress={goHome}>{t('Go Home')}</Button>
          )}
        </ButtonContainer>
      </ScrollContainer>
    </Container>
  );
};

export default VerifyIdentityScreen;
