import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
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
import {Analytics} from '../../../../store/app/app.effects';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import ZenLedgerModal from '../../../zenledger/components/ZenLedgerModal';
import {SettingsComponent} from '../SettingsRoot';

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
  const {connectors} = useAppSelector(({WALLET_CONNECT}) => WALLET_CONNECT);

  const [showZenLedgerModal, setShowZenLedgerModal] = useState(false);

  const goToWalletConnect = useCallback(() => {
    dispatch(
      Analytics.track('Clicked WalletConnect', {
        context: 'Settings Connections',
      }),
    );
    if (Object.keys(connectors).length) {
      navigation.navigate('WalletConnect', {
        screen: 'WalletConnectConnections',
      });
    } else {
      navigation.navigate('WalletConnect', {
        screen: 'Root',
        params: {uri: undefined},
      });
    }
  }, [dispatch, connectors, navigation]);

  const token = useAppSelector(({COINBASE}) => COINBASE.token[COINBASE_ENV]);
  const goToCoinbase = () => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Connect Coinbase', {
        context: 'Settings Connections',
      }),
    );
    if (token && token.access_token) {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseSettings',
        params: {fromScreen: 'Settings'},
      });
    } else {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseRoot',
      });
    }
  };

  useEffect(() => {
    if (redirectTo === 'walletconnect') {
      // reset params to prevent re-triggering
      navigation.setParams({redirectTo: undefined} as any);
      goToWalletConnect();
    } else if (redirectTo === 'zenledger') {
      navigation.setParams({redirectTo: undefined} as any);
      setShowZenLedgerModal(true);
    }
  }, [redirectTo, goToWalletConnect, setShowZenLedgerModal, navigation]);

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
          setShowZenLedgerModal(true);
        }}>
        <ConnectionItemContainer>
          <ConnectionIconContainer>
            <ZenLedgerIcon width={30} height={25} />
          </ConnectionIconContainer>
          <SettingTitle>ZenLedger Taxes</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>

      <ZenLedgerModal
        isVisible={showZenLedgerModal}
        onDismiss={() => {
          setShowZenLedgerModal(false);
        }}
      />
    </SettingsComponent>
  );
};

export default Connections;
