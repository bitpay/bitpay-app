import React from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {H3, Paragraph} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  Caution,
  Caution25,
  Success,
  Success25,
  Warning,
  Warning25,
  SlateDark,
  NeutralSlate,
  White,
  LightBlack,
} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {SumSubEffects} from '../../../store/sumsub';
import {navigationRef, RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';

const Container = styled.SafeAreaView`
  flex: 1;
`;

const Content = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
`;

const IconCircle = styled.View<{bg: string}>`
  width: 36px;
  height: 36px;
  border-radius: 36px;
  background-color: ${({bg}) => bg};
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
`;

const IconText = styled.Text`
  font-size: 16px;
`;

const Title = styled(H3)`
  text-align: left;
`;

const Body = styled(Paragraph)`
  text-align: left;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
  line-height: 22px;
`;

const ButtonContainer = styled.View`
  position: absolute;
  bottom: 40px;
  left: ${ScreenGutter};
  right: ${ScreenGutter};
`;

type KycState = 'actionRequired' | 'denied' | 'inReview' | 'success';

const STATE_CONFIG: Record<
  KycState,
  {icon: string; iconBg: string; titleKey: string; bodyKey: string}
> = {
  actionRequired: {
    icon: '!',
    iconBg: Warning25,
    titleKey: 'Action required on your application',
    bodyKey: 'Click the button below to resume your application.',
  },
  denied: {
    icon: '✕',
    iconBg: Caution25,
    titleKey: 'Application Denied',
    bodyKey:
      'Your account was denied. You will not be able to use BitPay products or services.',
  },
  inReview: {
    icon: '!',
    iconBg: Warning25,
    titleKey: 'Application in Review',
    bodyKey:
      'Your application is in review, please wait for an email to get your updated status.',
  },
  success: {
    icon: '*',
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
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const kycStatus = useAppSelector(({SUMSUB}) => SUMSUB.kycStatus[network]);

  const isApproved = kycStatus === 'Approved';

  let state: KycState;
  if (isApproved) {
    state = 'success';
  } else if (kycStatus === 'FinallyRejected') {
    state = 'denied';
  } else if (kycStatus === 'Pending') {
    state = 'inReview';
  } else {
    state = 'actionRequired';
  }

  const {icon, iconBg, titleKey, bodyKey} = STATE_CONFIG[state];

  const handleResume = () => {
    dispatch(SumSubEffects.startKycVerification());
  };

  return (
    <Container>
      <Content>
        <IconCircle bg={iconBg}>
          <IconText>{icon}</IconText>
        </IconCircle>
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
