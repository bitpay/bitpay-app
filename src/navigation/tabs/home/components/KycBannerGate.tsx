import React from 'react';
import {TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {BaseText} from '../../../../components/styled/Text';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {
  CharcoalBlack,
  LightBlue,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {dismissKycHomeBanner} from '../../../../store/app/app.actions';
import {SumSubSelectors} from '../../../../store/sumsub';
import {KycUiState} from '../../../../store/sumsub/sumsub.selectors';
import {BitpayIdScreens} from '../../../bitpay-id/BitpayIdGroup';
import HomeSection from './HomeSection';
import {SvgProps} from 'react-native-svg';
import IconPersonIdentifyVerification from '../../../../../assets/img/person_identity_verification.svg';
import IconHomeIdentityVerified from '../../../../../assets/img/home_identity_verified.svg';
import IconAngleRight from '../../../../../assets/img/angle-right.svg';
import IconClose from '../../../../../assets/img/close-modal-icon.svg';

const BannerContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? CharcoalBlack : LightBlue)};
  border-radius: 100px;
  flex-direction: row;
  align-items: center;
  margin: 16px ${ScreenGutter} 0;
  padding: 16px;
  gap: 4px;
`;

const BannerDot = styled.View`
  position: absolute;
  top: 0;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: 100px;
  background-color: #b42727;
`;

const BannerText = styled(BaseText)`
  flex: 1;
  font-size: 12px;
  line-height: 15px;
  margin-left: 4px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const DismissButton = styled(TouchableOpacity)`
  padding: 0;
`;

type BannerConfig = {
  message: string;
  showDot: boolean;
  dismissible: boolean;
  icon: React.FC<SvgProps>;
};

function getHomeBannerConfig(
  userVerified: boolean | undefined,
  kycUiState: KycUiState,
  t: (key: string) => string,
): BannerConfig | null {
  if (!userVerified) {
    return null;
  }
  // notStarted is handled by the Get Verified modal, not the banner.
  if (kycUiState === 'notStarted') {
    return null;
  }
  if (kycUiState === 'success') {
    return {
      message: t('Congratulations! Your identity was verified.'),
      showDot: false,
      dismissible: true,
      icon: IconHomeIdentityVerified,
    };
  }
  if (kycUiState === 'denied') {
    return {
      message: t('Your application was denied.'),
      showDot: false,
      dismissible: true,
      icon: IconPersonIdentifyVerification,
    };
  }
  if (kycUiState === 'actionRequired') {
    return {
      message: t('Action required on your application.'),
      showDot: true,
      dismissible: false,
      icon: IconPersonIdentifyVerification,
    };
  }
  // inReview
  return {
    message: t('Identity verification in review.'),
    showDot: true,
    dismissible: false,
    icon: IconPersonIdentifyVerification,
  };
}

const KycBannerGate: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID?.user?.[network]);
  const kycUiState = useAppSelector(SumSubSelectors.selectKycUiState);
  const dismissed = useAppSelector(({APP}) => APP?.kycHomeBannerDismissed);

  const {t} = useTranslation();

  if (dismissed || !user) {
    return null;
  }

  const config = getHomeBannerConfig(user.verified, kycUiState, t);

  if (!config) {
    return null;
  }

  const navigateToVerify = () => {
    navigation.navigate(BitpayIdScreens.VERIFY_IDENTITY as never);
  };

  return (
    <HomeSection>
      <BannerContainer
        onPress={config.dismissible ? undefined : navigateToVerify}>
        {config.icon && <config.icon width={16} height={16} />}
        <BannerText>{config.message}</BannerText>
        {config.dismissible ? (
          <DismissButton
            onPress={() => dispatch(dismissKycHomeBanner())}
            accessibilityLabel="Dismiss KYC notification">
            <IconClose width={16} height={16} />
          </DismissButton>
        ) : (
          <IconAngleRight width={16} height={16} />
        )}
        {config.showDot && <BannerDot />}
      </BannerContainer>
    </HomeSection>
  );
};

export default React.memo(KycBannerGate);
