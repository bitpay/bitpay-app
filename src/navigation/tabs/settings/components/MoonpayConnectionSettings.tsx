import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
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
import {useTheme} from '../../../../contexts';
import haptic from '../../../../components/haptic-feedback/haptic';
import {SettingsScreens} from '../SettingsGroup';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  accountCard: {
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  accountEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  unlinkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  unlinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: Action,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: White,
  },
  notConnectedText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
});

const Container = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.container, style]} {...rest} />
);

const AccountCard = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.accountCard,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountInfo = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.accountInfo, style]} {...rest} />
);

const AccountName = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.accountName,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountEmail = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.accountEmail,
        {color: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const UnlinkButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.unlinkButton, style]} {...rest} />
);

const UnlinkText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.unlinkText,
        {color: theme.dark ? LinkBlue : Action},
        style,
      ]}
      {...rest}
    />
  );
};

const ConnectButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.connectButton, style]} {...rest} />
);

const ConnectButtonText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.connectButtonText, style]} {...rest} />
);

const NotConnectedText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.notConnectedText,
        {color: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const MoonpayConnectionSettings = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();

  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const anonymousEid = useAppSelector(({APP}) => APP.brazeEid);

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
      onSkipConnection: () => {
        navigation.reset({
          index: 1,
          routes: [
            {
              name: 'Tabs',
              params: {screen: 'Settings'},
            },
            {
              name: SettingsScreens.SETTINGS_DETAILS,
              params: {
                initialRoute: 'Connections',
              },
            },
          ],
        });
      },
    });
  };

  return (
    <SettingsComponent>
      <Container>
        {isConnected ? (
          <AccountCard>
            <AccountInfo>
              {!displayName && !user?.email && anonymousEid ? (
                <>
                  <AccountName>{t('User ID')}</AccountName>
                  <AccountEmail>{anonymousEid}</AccountEmail>
                </>
              ) : null}
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
