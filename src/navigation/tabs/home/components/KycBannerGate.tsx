import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextProps,
  TouchableOpacity,
  View,
  ViewProps,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../../../contexts';
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

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: parseInt(ScreenGutter, 10),
    marginBottom: 0,
    padding: 16,
    gap: 4,
  },
  bannerDot: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 100,
    backgroundColor: '#b42727',
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 15,
    marginLeft: 4,
  },
  dismissButton: {
    padding: 0,
  },
});

const BannerContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.bannerContainer,
        {backgroundColor: theme.dark ? CharcoalBlack : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const BannerDot = ({style, ...rest}: ViewProps) => (
  <View style={[styles.bannerDot, style]} {...rest} />
);

const BannerText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.bannerText,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const DismissButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.dismissButton, style]} {...rest} />
);

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
