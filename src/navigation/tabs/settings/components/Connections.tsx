import {useNavigation} from '@react-navigation/native';
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
import {ShopScreens} from '../../shop/ShopStack';
import {ShopTabs} from '../../shop/ShopHome';

const MethodIcon = require('../../../../../assets/img/logos/method.png');

interface ConnectionsProps {
  redirectTo?: string;
}

const ConnectionItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const ConnectionIconContainer = styled.View`
  margin-right: 5px;
`;

const Connections: React.VFC<ConnectionsProps> = props => {
  const {redirectTo} = props;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.sessions,
  );
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
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
      navigation.navigate('Shop', {
        screen: ShopScreens.HOME,
        params: {
          screen: ShopTabs.BILLS,
        },
      });
    }
    dispatch(
      Analytics.track('Bill Pay — Clicked Bill Pay', {
        context: 'Settings Connections',
      }),
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
      <Setting onPress={() => goToCoinbase()}>
        <ConnectionItemContainer>
          <ConnectionIconContainer>
            <CoinbaseSvg width={30} height={25} />
          </ConnectionIconContainer>
          <SettingTitle>Coinbase</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting onPress={() => goToMethod()}>
        <ConnectionItemContainer>
          <ConnectionIconContainer style={{marginLeft: 6, marginRight: 9}}>
            <Image source={MethodIcon} />
          </ConnectionIconContainer>
          <SettingTitle>Method (Bill Pay)</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
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
