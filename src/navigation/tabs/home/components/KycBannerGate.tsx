import React, {useEffect, useState} from 'react';
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
import {SumSubActions, SumSubSelectors} from '../../../../store/sumsub';
import {KycUiState} from '../../../../store/sumsub/sumsub.types';
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
  kycUiState: KycUiState,
  t: (key: string) => string,
): BannerConfig | null {
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
  const eid = useAppSelector(({BITPAY_ID}) => BITPAY_ID?.user?.[network]?.eid);
  const bannerState = useAppSelector(SumSubSelectors.selectKycBannerState);

  const {t} = useTranslation();

  const [held, setHeld] = useState<KycUiState | null>(null);
  const [dismissed, setDismissed] = useState<KycUiState | null>(null);

  useEffect(() => {
    setHeld(null);
    setDismissed(null);
  }, [eid]);

  useEffect(() => {
    if (
      !eid ||
      !bannerState ||
      !SumSubSelectors.isOneShotBannerState(bannerState)
    ) {
      return;
    }
    setHeld(bannerState);
    dispatch(SumSubActions.setKycBannerAck(network, {eid, state: bannerState}));
  }, [bannerState, eid, network, dispatch]);

  const displayState = bannerState ?? held;

  if (!displayState || displayState === dismissed) {
    return null;
  }

  const config = getHomeBannerConfig(displayState, t);

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
            onPress={() => setDismissed(displayState)}
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
