import React, {useEffect} from 'react';
import {SvgProps} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TextProps, View, ViewProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../../contexts';
import {H2, H3, Paragraph} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
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
    paddingVertical: 0,
    paddingHorizontal: parseInt(ScreenGutter, 10),
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
  titleKey: string;
  bodyKey: string;
};

const STATE_CONFIG: Record<
  Exclude<KycUiState, 'notStarted'>,
  KycStateConfig
> = {
  actionRequired: {
    icon: IconKycStatusDenied,
    iconBg: Caution25,
    titleKey: 'Action required on your application',
    bodyKey: 'Click the button below to resume your application.',
  },
  denied: {
    icon: IconKycStatusDenied,
    iconBg: Caution25,
    titleKey: 'Application Denied',
    bodyKey:
      'Your account was denied. You will not be able to use BitPay products or services.',
  },
  inReview: {
    icon: IconKycStatusPending,
    iconBg: Warning25,
    titleKey: 'Application in Review',
    bodyKey:
      'Your application is in review, please wait for an email to get your updated status.',
  },
  success: {
    icon: IconKycStatusVerified,
    iconBg: Success25,
    titleKey: 'Application Success',
    bodyKey:
      'Your account was approved! You may now continue to use BitPay products and services.',
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

  const handleResume = () => {
    dispatch(SumSubEffects.startKycVerification());
  };

  if (state === 'notStarted') {
    return (
      <Container>
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
          <Button onPress={handleResume}>{t('Verify My Identity')}</Button>
        </ButtonContainer>
      </Container>
    );
  }

  const {icon: Icon, titleKey, bodyKey} = STATE_CONFIG[state];

  return (
    <Container>
      <Content>
        <IconStatus>{Icon && <Icon />}</IconStatus>
        <Title>{t(titleKey)}</Title>
        <Body>{t(bodyKey)}</Body>
      </Content>

      <ButtonContainer>
        {state === 'actionRequired' ? (
          <Button onPress={handleResume}>{t('Resume Application')}</Button>
        ) : (
          <Button onPress={goHome}>{t('Go Home')}</Button>
        )}
      </ButtonContainer>
    </Container>
  );
};

export default VerifyIdentityScreen;
