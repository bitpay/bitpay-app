import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, Platform, StyleSheet, View} from 'react-native';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import WalletConnectIcon from '../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import ZenLedgerIcon from '../../../../../assets/img/zenledger/zenledger-icon.svg';
import haptic from '../../../../components/haptic-feedback/haptic';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {SettingsComponent} from '../SettingsRoot';
import {SettingsDetailsParamList} from '../SettingsDetails';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import TransakLogo from '../../../../components/icons/external-services/transak/transak-logo';
import {
  getMoonpayEmbeddedAnonymousCredentials,
  getMoonpayEmbeddedApplePaySupported,
  getMoonpayEmbeddedEnabled,
  getMoonpayEmbeddedStatus,
  isMoonpayEmbeddedCredentialsValid,
  setMoonpayEmbeddedCredentials,
  setMoonpayEmbeddedStatus,
} from '../../../../store/buy-crypto/buy-crypto.effects';
import {ExternalServicesScreens} from '../../../services/ExternalServicesGroup';
import {MoonpayClientCredentials} from '../../../services/utils/moonpayFrameCrypto';
import {
  getCachedExternalServicesConfig,
  getExternalServicesConfig,
} from '../../../../store/external-services/external-services.effects';
import {
  BuyCryptoConfig,
  ExternalServicesConfig,
} from '../../../../store/external-services/external-services.types';
import {
  getTransakHeadlessConnectionWallet,
  isTransakHeadlessConnectionEnabled,
  isTransakHeadlessUserAuthValid,
  transakEnv,
} from '../../../services/buy-crypto/utils/transak-utils';
import {BuyCryptoActions} from '../../../../store/buy-crypto';
import {TransakHeadlessUserAuthData} from '../../../../store/buy-crypto/buy-crypto.models';
import {getErrorString} from '../../../../utils/helper-methods';

const MethodIcon = require('../../../../../assets/img/logos/method.png');

const styles = StyleSheet.create({
  connectionItemContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  connectionIconContainer: {
    marginRight: 5,
  },
});

const ConnectionItemContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.connectionItemContainer, style]} {...rest} />
);

const ConnectionIconContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.connectionIconContainer, style]} {...rest} />
);

const Connections = () => {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<SettingsDetailsParamList, 'Connections'>>();
  const {redirectTo} = route.params || {};
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const sessions = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.sessions,
  );
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  const moonpayEmbeddedEnabled = getMoonpayEmbeddedEnabled();

  const country = useAppSelector(
    ({LOCATION}) => LOCATION.locationData?.countryShortCode,
  );
  const transakWallet = useAppSelector(({WALLET}) =>
    getTransakHeadlessConnectionWallet(WALLET.keys),
  );
  const transakHeadlessUserAuth: TransakHeadlessUserAuthData | undefined =
    useAppSelector(
      ({BUY_CRYPTO}) => BUY_CRYPTO.tokens?.transakHeadlessUser?.[transakEnv],
    );
  const [buyCryptoConfig, setBuyCryptoConfig] = useState<
    BuyCryptoConfig | undefined
  >(() => getCachedExternalServicesConfig()?.config?.buyCrypto);
  const transakHeadlessEnabled =
    !!transakWallet &&
    !!buyCryptoConfig &&
    isTransakHeadlessConnectionEnabled(buyCryptoConfig, country, {
      applePaySupported:
        Platform.OS === 'ios' && getMoonpayEmbeddedApplePaySupported(),
      googlePaySupported: Platform.OS === 'android',
    });

  useEffect(() => {
    if (getCachedExternalServicesConfig()) {
      return;
    }
    dispatch(getExternalServicesConfig())
      .then((config: ExternalServicesConfig) =>
        setBuyCryptoConfig(config?.buyCrypto),
      )
      .catch((err: unknown) =>
        logger.debug(
          `[Connections] could not get the external services config: ${getErrorString(
            err,
          )}`,
        ),
      );
  }, [dispatch, logger]);

  const goToWalletConnect = useCallback(() => {
    dispatch(
      Analytics.track('Clicked WalletConnect', {
        context: 'Settings Connections',
      }),
    );
    if (Object.keys(sessions).length) {
      navigation.navigate('WalletConnectConnections');
    } else {
      navigation.navigate('WalletConnectRoot', {});
    }
  }, [dispatch, sessions, navigation]);

  const goToMethod = () => {
    haptic('impactLight');
    if (user?.methodEntityId) {
      navigation.navigate('BillSettings', {});
    } else {
      navigation.navigate('Tabs', {
        screen: 'Bills',
      });
    }
    dispatch(
      Analytics.track('Bill Pay - Clicked Bill Pay', {
        context: 'Settings Connections',
      }),
    );
  };

  const goToMoonpay = () => {
    haptic('impactLight');
    const isConnected = isMoonpayEmbeddedCredentialsValid();
    const embeddedStatus = getMoonpayEmbeddedStatus();

    dispatch(
      Analytics.track('Clicked Moonpay', {
        context: 'Settings Connections',
      }),
    );

    if (isConnected && embeddedStatus === 'active') {
      navigation.navigate('MoonpayConnectionSettings');
      return;
    }

    // Not connected — try to go directly to onboarding if anonymous creds are ready.
    const anonymousCreds = getMoonpayEmbeddedAnonymousCredentials();
    if (anonymousCreds) {
      navigation.navigate(
        ExternalServicesScreens.MOONPAY_BUY_EMBEDDED_ONBOARDING,
        {
          context: 'connections',
          user,
          anonymousCredentials: anonymousCreds,
          onConnectAccount: async (
            newCredentials: MoonpayClientCredentials,
          ) => {
            setMoonpayEmbeddedCredentials(newCredentials);
            setMoonpayEmbeddedStatus('active');
            navigation.navigate('MoonpayConnectionSettings');
          },
          onSkipConnection: async () => {
            navigation.goBack();
          },
        },
      );
      return;
    }

    // Anonymous credentials not yet available (still checking) —
    // navigate to the settings screen which shows the Connect button.
    navigation.navigate('MoonpayConnectionSettings');
  };

  const goToTransak = () => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Transak', {
        context: 'Settings Connections',
      }),
    );
    if (
      !transakWallet ||
      isTransakHeadlessUserAuthValid(transakHeadlessUserAuth)
    ) {
      navigation.navigate('TransakConnectionSettings');
      return;
    }
    navigation.navigate(
      ExternalServicesScreens.TRANSAK_BUY_HEADLESS_ONBOARDING,
      {
        wallet: transakWallet,
        context: 'connections',
        country,
        initialEmail: user?.email,
        onConnect: (userAuth: TransakHeadlessUserAuthData) => {
          dispatch(
            BuyCryptoActions.updateHeadlessUserAuthTransak({
              env: transakEnv,
              userAuth,
            }),
          );
          navigation.navigate('TransakConnectionSettings');
        },
      },
    );
  };

  useEffect(() => {
    if (redirectTo === 'walletconnect') {
      // reset params to prevent re-triggering
      navigation.setParams({redirectTo: undefined} as any);
      goToWalletConnect();
    } else if (redirectTo === 'zenledger') {
      navigation.setParams({redirectTo: undefined} as any);
      navigation.navigate('ZenLedgerRoot');
    }
  }, [redirectTo, goToWalletConnect, navigation]);

  return (
    <SettingsComponent>
      <Setting
        testID="settings-connections-method-row"
        accessibilityLabel={t('Method (Bill Pay)')}
        onPress={() => goToMethod()}>
        <ConnectionItemContainer>
          <ConnectionIconContainer style={{marginLeft: 6, marginRight: 9}}>
            <Image source={MethodIcon} />
          </ConnectionIconContainer>
          <SettingTitle>{t('Method (Bill Pay)')}</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      {moonpayEmbeddedEnabled ? (
        <>
          <Setting
            testID="settings-connections-moonpay-row"
            accessibilityLabel={t('Moonpay')}
            onPress={() => goToMoonpay()}>
            <ConnectionItemContainer>
              <ConnectionIconContainer style={{marginLeft: 3}}>
                <MoonpayLogo iconOnly={true} widthIcon={26} heightIcon={25} />
              </ConnectionIconContainer>
              <SettingTitle>Moonpay</SettingTitle>
            </ConnectionItemContainer>
            <AngleRight />
          </Setting>
          <Hr />
        </>
      ) : null}
      {transakHeadlessEnabled ? (
        <>
          <Setting
            testID="settings-connections-transak-row"
            accessibilityLabel={'Transak'}
            onPress={() => goToTransak()}>
            <ConnectionItemContainer>
              <ConnectionIconContainer style={{marginLeft: 3}}>
                <TransakLogo iconOnly={true} width={26} height={25} />
              </ConnectionIconContainer>
              <SettingTitle>Transak</SettingTitle>
            </ConnectionItemContainer>
            <AngleRight />
          </Setting>
          <Hr />
        </>
      ) : null}
      <Setting
        testID="settings-connections-walletconnect-row"
        accessibilityLabel={t('WalletConnect')}
        onPress={() => {
          haptic('impactLight');
          goToWalletConnect();
        }}>
        <ConnectionItemContainer>
          <ConnectionIconContainer>
            <WalletConnectIcon width={30} height={25} />
          </ConnectionIconContainer>
          <SettingTitle>WalletConnect</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        testID="settings-connections-zenledger-row"
        accessibilityLabel={t('ZenLedger taxes')}
        onPress={() => {
          haptic('impactLight');
          dispatch(
            Analytics.track('Clicked ZenLedger', {
              context: 'Settings Connections',
            }),
          );
          navigation.navigate('ZenLedgerRoot');
        }}>
        <ConnectionItemContainer>
          <ConnectionIconContainer>
            <ZenLedgerIcon width={30} height={25} />
          </ConnectionIconContainer>
          <SettingTitle>ZenLedger Taxes</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
    </SettingsComponent>
  );
};

export default Connections;
