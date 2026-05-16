import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect} from 'react';
import {Image} from 'react-native';
import styled from 'styled-components/native';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import CoinbaseSvg from '../../../../../assets/img/logos/coinbase.svg';
import WalletConnectIcon from '../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import ZenLedgerIcon from '../../../../../assets/img/zenledger/zenledger-icon.svg';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import haptic from '../../../../components/haptic-feedback/haptic';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {SettingsComponent} from '../SettingsRoot';
import {SettingsDetailsParamList} from '../SettingsDetails';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import {
  getMoonpayEmbeddedAnonymousCredentials,
  getMoonpayEmbeddedEnabled,
  getMoonpayEmbeddedStatus,
  isMoonpayEmbeddedCredentialsValid,
  setMoonpayEmbeddedCredentials,
  setMoonpayEmbeddedStatus,
} from '../../../../store/buy-crypto/buy-crypto.effects';
import {ExternalServicesScreens} from '../../../services/ExternalServicesGroup';
import {MoonpayClientCredentials} from '../../../services/utils/moonpayFrameCrypto';

const MethodIcon = require('../../../../../assets/img/logos/method.png');

const ConnectionItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const ConnectionIconContainer = styled.View`
  margin-right: 5px;
`;

const Connections = () => {
  const route = useRoute<RouteProp<SettingsDetailsParamList, 'Connections'>>();
  const {redirectTo} = route.params || {};
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.sessions,
  );
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  const moonpayEmbeddedEnabled = getMoonpayEmbeddedEnabled();

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

  const token = useAppSelector(({COINBASE}) => COINBASE.token[COINBASE_ENV]);
  const goToCoinbase = () => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Connect Coinbase', {
        context: 'Settings Connections',
      }),
    );
    if (token && token.access_token) {
      navigation.navigate('CoinbaseSettings', {fromScreen: 'Settings'});
    } else {
      navigation.navigate('CoinbaseRoot');
    }
  };

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
        testID="settings-connections-coinbase-row"
        accessibilityLabel="Coinbase"
        onPress={() => goToCoinbase()}>
        <ConnectionItemContainer>
          <ConnectionIconContainer>
            <CoinbaseSvg width={30} height={25} />
          </ConnectionIconContainer>
          <SettingTitle>Coinbase</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        testID="settings-connections-method-row"
        accessibilityLabel="Method bill pay"
        onPress={() => goToMethod()}>
        <ConnectionItemContainer>
          <ConnectionIconContainer style={{marginLeft: 6, marginRight: 9}}>
            <Image source={MethodIcon} />
          </ConnectionIconContainer>
          <SettingTitle>Method (Bill Pay)</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      {moonpayEmbeddedEnabled ? (
        <>
          <Setting
            testID="settings-connections-moonpay-row"
            accessibilityLabel="Moonpay"
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
      <Setting
        testID="settings-connections-walletconnect-row"
        accessibilityLabel="WalletConnect"
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
        accessibilityLabel="ZenLedger taxes"
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
