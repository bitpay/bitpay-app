import React, {useState} from 'react';
import {TouchableOpacity} from 'react-native';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {SettingsComponent} from '../SettingsRoot';
import {BaseText} from '../../../../components/styled/Text';
import {useAppSelector} from '../../../../utils/hooks';
import {
  clearMoonpayEmbeddedCredentials,
  getMoonpayEmbeddedAnonymousCredentials,
  isMoonpayEmbeddedCredentialsValid,
  requestMoonpayEmbeddedRecheck,
  setMoonpayEmbeddedAnonymousCredentials,
  setMoonpayEmbeddedCredentials,
  setMoonpayEmbeddedStatus,
} from '../../../../store/buy-crypto/buy-crypto.effects';
import {MoonPayResetFrame} from '../../../services/components/MoonPayResetFrame';
import {MoonpayClientCredentials} from '../../../services/utils/moonpayFrameCrypto';
import {
  Action,
  LightBlack,
  LinkBlue,
  NeutralSlate,
  Slate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useTheme} from '@react-navigation/native';
import haptic from '../../../../components/haptic-feedback/haptic';

const Container = styled.View`
  flex: 1;
  padding: 16px;
`;

const AccountCard = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  padding: 24px 16px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const AccountInfo = styled.View`
  flex: 1;
`;

const AccountName = styled(BaseText)`
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AccountEmail = styled(BaseText)`
  font-size: 13px;
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  margin-top: 2px;
`;

const UnlinkButton = styled(TouchableOpacity)`
  padding: 4px 8px;
`;

const UnlinkText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
  font-weight: 500;
`;

const ConnectButton = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? Action : Action)};
  border-radius: 8px;
  padding: 14px;
  align-items: center;
  margin-top: 32px;
`;

const ConnectButtonText = styled(BaseText)`
  font-size: 15px;
  font-weight: 600;
  color: ${White};
`;

const NotConnectedText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  margin-bottom: 12px;
  line-height: 20px;
`;

const MoonpayConnectionSettings = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();

  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);

  const [runReset, setRunReset] = useState(false);
  const [unlinked, setUnlinked] = useState(false);

  // Read connection status from module cache
  const isConnected = !unlinked && isMoonpayEmbeddedCredentialsValid();
  const displayName =
    [user?.givenName, user?.familyName].filter(Boolean).join(' ') ||
    user?.email ||
    '';

  const handleUnlink = () => {
    haptic('impactLight');
    setRunReset(true);
  };

  const handleConnect = () => {
    haptic('impactLight');
    const anonymousCreds = getMoonpayEmbeddedAnonymousCredentials();
    (navigation as any).navigate('MoonpayBuyEmbeddedOnboarding', {
      user,
      anonymousCredentials: anonymousCreds ?? ({} as MoonpayClientCredentials),
      onConnectAccount: (newCredentials: MoonpayClientCredentials) => {
        setMoonpayEmbeddedCredentials(newCredentials);
        setMoonpayEmbeddedStatus('active');
        setUnlinked(false);
        navigation.goBack();
      },
      onSkipConnection: () => {},
    });
  };

  return (
    <SettingsComponent>
      <Container>
        {isConnected ? (
          <AccountCard>
            <AccountInfo>
              {!!displayName && <AccountName>{displayName}</AccountName>}
              {!!user?.email && <AccountEmail>{user.email}</AccountEmail>}
            </AccountInfo>
            <UnlinkButton onPress={handleUnlink} disabled={runReset}>
              <UnlinkText>{t('Unlink Account')}</UnlinkText>
            </UnlinkButton>
          </AccountCard>
        ) : (
          <>
            <NotConnectedText>
              {t(
                'Connect your MoonPay account to use your saved payment methods and verified identity.',
              )}
            </NotConnectedText>
            <ConnectButton onPress={handleConnect}>
              <ConnectButtonText>
                {t('Connect MoonPay Account')}
              </ConnectButtonText>
            </ConnectButton>
          </>
        )}
      </Container>

      {/* Headless reset frame — runs when user taps "Unlink Account" */}
      {runReset && (
        <MoonPayResetFrame
          theme={theme.dark ? 'dark' : 'light'}
          onComplete={() => {
            clearMoonpayEmbeddedCredentials();
            setMoonpayEmbeddedAnonymousCredentials(undefined);
            setMoonpayEmbeddedStatus(undefined);
            setRunReset(false);
            setUnlinked(true);
            // Ask MoonpayEmbeddedCredentialManager to run a new check so
            // anonymous credentials are ready if the user wants to reconnect.
            requestMoonpayEmbeddedRecheck();

            // if (user?.eid) {
            //   try {
            //     await moonpayRevokeActiveSession({
            //       env: moonpayEnv,
            //       externalCustomerId: user.eid,
            //     });
            //   } catch (err) {
            //     logger.debug(
            //       `Moonpay could not revoke active connection. ${
            //         err instanceof Error ? err.message : JSON.stringify(err)
            //       }`,
            //     );
            //   }
            // }
            navigation.goBack();
          }}
          onError={err => {
            // Even if reset fails, clear credentials so the UI reflects unlinked state.
            clearMoonpayEmbeddedCredentials();
            setMoonpayEmbeddedAnonymousCredentials(undefined);
            setMoonpayEmbeddedStatus(undefined);
            setRunReset(false);
            setUnlinked(true);
            requestMoonpayEmbeddedRecheck();
          }}
        />
      )}
    </SettingsComponent>
  );
};

export default MoonpayConnectionSettings;
