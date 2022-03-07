import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import WalletConnectIcon from '../../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import AngleRight from '../../../../../../assets/img/angle-right.svg';

import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {WalletConnectIconContainer} from '../../../../wallet-connect/styled/WalletConnectContainers';

const ConnectionItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const ConnectionSettingsRoot: React.FC = () => {
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
    <SettingsContainer>
      <Settings>
        <Setting onPress={() => goToNextView()}>
          <ConnectionItemContainer>
            <WalletConnectIconContainer>
              <WalletConnectIcon />
            </WalletConnectIconContainer>
            <SettingTitle>WalletConnect</SettingTitle>
          </ConnectionItemContainer>
          <AngleRight />
        </Setting>
        <Hr />
      </Settings>
    </SettingsContainer>
  );
};

export default ConnectionSettingsRoot;
