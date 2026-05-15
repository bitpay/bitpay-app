import React, {useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {SettingsComponent} from '../../SettingsRoot';
import {H4, Paragraph} from '../../../../../components/styled/Text';
import Button from '../../../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {SumSubEffects} from '../../../../../store/sumsub';
import {SUMSUB_DEV_TOKEN} from '../../../../../api/sumsub';
import {
  White,
  SlateDark,
  LightBlue,
  Midnight,
} from '../../../../../styles/colors';

const Container = styled.View`
  flex: 1;
  padding: 24px 16px;
`;

const StatusBadge = styled.View<{status: string}>`
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 20px;
  margin-top: 4px;
  background-color: ${({status, theme}) => {
    if (status === 'Approved') {
      return '#1a7f37';
    }
    if (status === 'FinallyRejected') {
      return '#cf222e';
    }
    if (status === 'Pending') {
      return '#9a6700';
    }
    return theme.dark ? Midnight : LightBlue;
  }};
`;

const StatusText = styled.Text`
  color: ${White};
  font-size: 13px;
  font-weight: 600;
`;

const DevBanner = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #6e40c9;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
`;

const DevBannerText = styled.Text`
  color: ${White};
  font-size: 12px;
  font-weight: 600;
  flex: 1;
`;

const Description = styled(Paragraph)`
  margin: 12px 0 24px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  line-height: 22px;
`;

const statusLabel: Record<string, string> = {
  Approved: 'Verified',
  Pending: 'Under Review',
  Incomplete: 'Incomplete',
  TemporarilyDeclined: 'Temporarily Declined',
  FinallyRejected: 'Rejected',
  Initial: 'Not Started',
};

const KycVerification: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const network = useAppSelector(({APP}) => APP.network);
  const kycStatus = useAppSelector(({SUMSUB}) => SUMSUB.kycStatus[network]);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  const isVerified = kycStatus === 'Approved';
  const isPending = kycStatus === 'Pending';
  const isDevTokenActive = __DEV__ && !!SUMSUB_DEV_TOKEN;

  const onPressVerify = async () => {
    setLoading(true);
    try {
      await dispatch(SumSubEffects.startKycVerification());
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SettingsComponent>
        <Container>
          <H4>{t('Verify Identity')}</H4>
          <Description>
            {t(
              'Please log in with your BitPay ID to start identity verification.',
            )}
          </Description>
        </Container>
      </SettingsComponent>
    );
  }

  return (
    <SettingsComponent>
      <Container>
        <H4>{t('Verify Identity')}</H4>

        {kycStatus ? (
          <StatusBadge status={kycStatus}>
            <StatusText>{statusLabel[kycStatus] ?? kycStatus}</StatusText>
          </StatusBadge>
        ) : null}

        <Description>
          {isVerified
            ? t(
                'Your identity has been successfully verified. No further action is required.',
              )
            : isPending
            ? t(
                'Your documents are currently under review. We will notify you once the process is complete.',
              )
            : t(
                'Verify your identity to unlock all features. You will need a government-issued photo ID and a selfie.',
              )}
        </Description>

        {isDevTokenActive && (
          <DevBanner>
            <DevBannerText>{'Dev mode'}</DevBannerText>
          </DevBanner>
        )}

        {!isVerified && !isPending && (
          <Button onPress={onPressVerify} disabled={loading}>
            {loading ? (
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <ActivityIndicator color={White} size="small" />
              </View>
            ) : (
              t(kycStatus ? 'Continue Verification' : 'Start Verification')
            )}
          </Button>
        )}
      </Container>
    </SettingsComponent>
  );
};

export default KycVerification;
