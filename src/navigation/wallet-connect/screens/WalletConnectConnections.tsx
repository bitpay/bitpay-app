import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useAppSelector} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import KeyIcon from '../../../../assets/img/key.svg';
import AddConnection from '../../../components/add/Add';
import {Hr} from '../../../components/styled/Containers';
import {HeaderTitle} from '../styled/WalletConnectText';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {Platform} from 'react-native';
import _ from 'lodash';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {
  IWCConnector,
  IWCCustomData,
} from '../../../store/wallet-connect/wallet-connect.models';
import Connections from '../components/Connections';
import WalletSelector from '../components/WalletSelector';
import {useTranslation} from 'react-i18next';

const KeyConnectionsContainer = styled.View`
  margin-top: 26px;
  padding-bottom: 32px;
`;

const KeyTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 12px;
`;

const KeyTitleText = styled(BaseText)`
  font-size: 14px;
  font-weight: 700;
  line-height: 14px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  padding-right: 12px;
  padding-left: 6px;
  padding-top: ${Platform.OS === 'ios' ? '4px' : '8px'};
`;

const AddConnectionContainer = styled.TouchableOpacity`
  margin-right: 15px;
`;

const WalletConnectConnections = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [groupedConnectors, setGroupedConnectors] = useState({});
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const showWalletSelector = () => setWalletSelectorModalVisible(true);
  const hideWalletSelector = () => setWalletSelectorModalVisible(false);
  const connectors: IWCConnector[] = useAppSelector(
    ({WALLET_CONNECT}) => WALLET_CONNECT.connectors,
  );

  useEffect(() => {
    if (!Object.keys(connectors).length) {
      navigation.goBack();
    } else {
      const _groupedConnectors = _.mapValues(
        _.groupBy(connectors, connector => connector.customData.keyId),
        connector => _.groupBy(connector, c => c.customData.walletId),
      );
      setGroupedConnectors(_groupedConnectors);
    }
  }, [connectors, navigation, setGroupedConnectors]);

  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);

  const getWallet = (customData?: IWCCustomData) => {
    return customData && allKeys[customData.keyId]
      ? findWalletById(allKeys[customData.keyId].wallets, customData.walletId)
      : null;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <AddConnectionContainer onPress={showWalletSelector}>
            <AddConnection opacity={1} />
          </AddConnectionContainer>
        );
      },
    });
  }, [navigation]);

  return (
    <WalletConnectContainer>
      <ScrollView>
        <HeaderTitle>{t('Connections')}</HeaderTitle>
        {Object.entries(groupedConnectors).map(([keyId, connectorsByKey]) => {
          return (
            <KeyConnectionsContainer key={keyId}>
              <KeyTitleContainer>
                <KeyIcon />
                <KeyTitleText>
                  {allKeys[keyId].keyName || 'My Key'}
                </KeyTitleText>
              </KeyTitleContainer>
              <Hr />
              {Object.entries(connectorsByKey as any).map(
                ([walletId, _connectors]) => {
                  const wallet = getWallet(
                    (_connectors as IWCConnector[])[0].customData,
                  );
                  return wallet ? (
                    <Connections
                      key={walletId}
                      connectors={_connectors as IWCConnector[]}
                      wallet={wallet}
                    />
                  ) : null;
                },
              )}
            </KeyConnectionsContainer>
          );
        })}
        <WalletSelector
          isVisible={walletSelectorModalVisible}
          dappUri={''}
          onBackdropPress={hideWalletSelector}
        />
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectConnections;
