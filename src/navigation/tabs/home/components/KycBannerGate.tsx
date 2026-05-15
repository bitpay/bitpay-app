import React from 'react';
import {TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {BaseText} from '../../../../components/styled/Text';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {
  Caution,
  CharcoalBlack,
  LightBlack,
  Slate30,
  SlateDark,
  Success,
  Warning,
  White,
} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {dismissKycHomeBanner} from '../../../../store/app/app.actions';
import {SumSubKycStatus} from '../../../../store/sumsub/sumsub.reducer';
import {BitpayIdScreens} from '../../../bitpay-id/BitpayIdGroup';
import HomeSection from './HomeSection';

const BannerContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? CharcoalBlack : White)};
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-width: 1px;
  border-radius: 12px;
  flex-direction: row;
  align-items: center;
  margin: 8px ${ScreenGutter} 0;
  padding: 14px 16px;
  gap: 12px;
`;

const BannerDot = styled.View<{color: string}>`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({color}) => color};
  flex-shrink: 0;
`;

const BannerText = styled(BaseText)`
  flex: 1;
  font-size: 14px;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const DismissButton = styled(TouchableOpacity)`
  padding: 4px;
`;

const DismissText = styled(BaseText)`
  font-size: 18px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

type BannerConfig = {
  message: string;
  dotColor: string;
  dismissible: boolean;
};

function getHomeBannerConfig(
  userVerified: boolean | undefined,
  kycStatus: SumSubKycStatus,
  t: (key: string) => string,
): BannerConfig | null {
  if (!userVerified) {
    return null;
  }
  if (kycStatus === 'Approved') {
    return {
      message: t('Congratulations! Your identity was verified.'),
      dotColor: Success,
      dismissible: true,
    };
  }
  if (kycStatus === 'FinallyRejected') {
    return {
      message: t('Your application was denied.'),
      dotColor: Caution,
      dismissible: true,
    };
  }
  if (kycStatus === 'TemporarilyDeclined') {
    return {
      message: t('Action required on your application.'),
      dotColor: Caution,
      dismissible: false,
    };
  }
  if (kycStatus === 'Pending') {
    return {
      message: t('Identity verification in review.'),
      dotColor: Warning,
      dismissible: false,
    };
  }
  if (kycStatus === 'Incomplete') {
    return {
      message: t('Action required on your application.'),
      dotColor: Warning,
      dismissible: false,
    };
  }
  return {
    message: t('Continue identity verification.'),
    dotColor: Warning,
    dismissible: false,
  };
}

const KycBannerGate: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const kycStatus = useAppSelector(({SUMSUB}) => SUMSUB.kycStatus[network]);
  const dismissed = useAppSelector(({APP}) => APP.kycHomeBannerDismissed);

  const {t} = useTranslation();

  if (dismissed || !user) {
    return null;
  }

  const config = getHomeBannerConfig(
    user.verified,
    kycStatus,
    t,
  );

  if (!config) {
    return null;
  }

  const navigateToVerify = () => {
    navigation.navigate(BitpayIdScreens.VERIFY_IDENTITY as never);
  };

  return (
    <HomeSection>
      <BannerContainer>
        <BannerDot color={config.dotColor} />
        <BannerText
          onPress={config.dismissible ? undefined : navigateToVerify}>
          {config.message}
        </BannerText>
        {config.dismissible ? (
          <DismissButton
            onPress={() => dispatch(dismissKycHomeBanner())}
            accessibilityLabel="Dismiss KYC notification"
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <DismissText>✕</DismissText>
          </DismissButton>
        ) : null}
      </BannerContainer>
    </HomeSection>
  );
};

export default React.memo(KycBannerGate);
