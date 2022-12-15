import React, {useCallback, useEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../../components/haptic-feedback/haptic';
import {SettingsComponent} from '../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import WalletConnectIcon from '../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import ZenLedgerIcon from '../../../../../assets/img/zenledger/zenledger-icon.svg';
import CoinbaseSvg from '../../../../../assets/img/logos/coinbase.svg';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {logSegmentEvent} from '../../../../store/app/app.effects';
import ZenLedgerModal from '../../../zenledger/components/ZLModal';

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

const Connections: React.FC<ConnectionsProps> = props => {
  const {redirectTo} = props;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {connectors} = useAppSelector(({WALLET_CONNECT}) => WALLET_CONNECT);

  const [showModal, setShowModal] = useState(false);

  const goToWalletConnect = useCallback(() => {
    dispatch(
      logSegmentEvent('track', 'Clicked WalletConnect', {
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
  }, [connectors, navigation]);

  const token = useAppSelector(({COINBASE}) => COINBASE.token[COINBASE_ENV]);
  const goToCoinbase = () => {
    haptic('impactLight');
    dispatch(
      logSegmentEvent('track', 'Clicked Connect Coinbase', {
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
      setShowModal(true);
    }
  }, [redirectTo, goToWalletConnect, setShowModal, navigation]);

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
            logSegmentEvent('track', 'Clicked ZenLedger', {
              context: 'Settings Connections',
            }),
          );
          setShowModal(true);
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
        isVisible={showModal}
        onDismiss={() => {
          setShowModal(false);
        }}
      />
    </SettingsComponent>
  );
};

export default Connections;
