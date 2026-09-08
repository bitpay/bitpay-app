import React, {useEffect} from 'react';
import {SvgProps} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {SafeAreaView} from 'react-native-safe-area-context';
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

const Container = styled(SafeAreaView)`
  flex: 1;
  padding: 0 ${ScreenGutter};
`;

const Content = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
`;

const IconStatus = styled.View`
  margin-bottom: 8px;
`;

const Title = styled(H3)`
  text-align: left;
`;

const Body = styled(Paragraph)`
  text-align: left;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
  font-weight: 400;
`;

const ButtonContainer = styled.View`
  margin-top: 32px;
`;

const GetVerifiedTitle = styled(H2)`
  font-size: 31px;
  line-height: 38px;
  text-align: left;
  font-weight: 700;
  margin-bottom: 32px;
`;

const IllustrationContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : LightBlue)};
  border-radius: 32px;
  padding: 24px;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

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
