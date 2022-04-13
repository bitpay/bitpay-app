import React, {useEffect} from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import WalletConnectIcon from '../../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import AngleRight from '../../../../../../assets/img/angle-right.svg';

import styled from 'styled-components/native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {WalletConnectIconContainer} from '../../../../wallet-connect/styled/WalletConnectContainers';
import {useAppSelector} from '../../../../../utils/hooks';
import {ConnectionsSettingsStackParamList} from '../ConnectionsStack';

const ConnectionItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const ConnectionSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const {connectors} = useAppSelector(({WALLET_CONNECT}) => WALLET_CONNECT);
  const route =
    useRoute<RouteProp<ConnectionsSettingsStackParamList, 'Root'>>();
  const {redirectTo} = route.params || {};

  const goToWalletConnect = () => {
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

  useEffect(() => {
    if (redirectTo === 'walletconnect') {
      goToWalletConnect();
    }
  }, [redirectTo]);

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        <Setting onPress={() => goToWalletConnect()}>
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
