import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import haptic from '../../../../components/haptic-feedback/haptic';
import {SettingsComponent} from '../SettingsRoot';
import {Setting, SettingTitle} from '../../../../components/styled/Containers';
import {WalletConnectIconContainer} from '../../../wallet-connect/styled/WalletConnectContainers';
import WalletConnectIcon from '../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import React from 'react';

const ConnectionItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const Connections = () => {
  const navigation = useNavigation();
  const {connectors} = useSelector(
    ({WALLET_CONNECT}: RootState) => WALLET_CONNECT,
  );
  const goToNextView = () => {
    haptic('impactLight');
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
  };

  return (
    <SettingsComponent>
      <Setting onPress={() => goToNextView()}>
        <ConnectionItemContainer>
          <WalletConnectIconContainer>
            <WalletConnectIcon />
          </WalletConnectIconContainer>
          <SettingTitle>WalletConnect</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
    </SettingsComponent>
  );
};

export default Connections;
