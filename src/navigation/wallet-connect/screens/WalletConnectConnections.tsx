import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, H5, H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate, SlateDark} from '../../../styles/colors';
import WalletConnectIcon from '../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import AddIcon from '../../../../assets/img/add.svg';
import KeyIcon from '../../../../assets/img/key.svg';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import {useDispatch, useSelector} from 'react-redux';
import {Hr} from '../../../components/styled/Containers';
import {HeaderTitle, IconLabel} from '../styled/WalletConnectText';
import {
  ItemContainer,
  ItemNoteTouchableContainer,
  ScrollView,
  WalletConnectContainer,
  ItemTitleTouchableContainer,
  IconContainer,
} from '../styled/WalletConnectContainers';
import {Image, Platform} from 'react-native';
import {RootState} from '../../../store';

import {isValidWalletConnectUri, sleep} from '../../../utils/helper-methods';
import _ from 'lodash';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {wcConnector} from '../../../store/wallet-connect/wallet-connect.models';
import {
  walletConnectKillSession,
  walletConnectOnSessionRequest,
} from '../../../store/wallet-connect/wallet-connect.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';

const ConnectionsContainer = styled.View`
  padding-bottom: 64px;
`;

const KeyTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 12px;
  margin-top: 26px;
`;

const KeyTitleText = styled(BaseText)`
  font-size: 14px;
  font-weight: 700;
  line-height: 14px;
  color: ${SlateDark};
  padding-right: 12px;
  padding-left: 6px;
  padding-top: ${Platform.OS === 'ios' ? '4px' : '2px'};
`;

const ChainContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
`;

const ChainDetailsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ChainIconContainer = styled.View`
  border-radius: 100px;
  height: auto;
  width: auto;
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

const ChainTextContainer = styled.View`
  margin-left: 16px;
`;

const AddConnectionContainer = styled.TouchableOpacity`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  height: 43px;
  width: 80px;
  justify-content: space-around;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
`;

const WalletConnectConnections = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [groupedConnectors, setGroupedConnectors] = useState({});
  const connectors: wcConnector[] = useSelector(
    ({WALLET_CONNECT}: RootState) => WALLET_CONNECT.connectors,
  );

  useEffect(() => {
    if (!Object.keys(connectors).length) {
      navigation.reset({
        index: 2,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Settings'},
          },
          {
            name: 'ConnectionSettings',
            params: {
              screen: 'Root',
            },
          },
          {
            name: 'WalletConnect',
            params: {
              screen: 'Root',
            },
          },
        ],
      });
      dispatch(dismissOnGoingProcessModal());
    } else {
      const _groupedConnectors = _.mapValues(
        _.groupBy(connectors, connector => connector.customData.keyId),
        connector => _.groupBy(connector, c => c.customData.walletId),
      );
      setGroupedConnectors(_groupedConnectors);
      dispatch(dismissOnGoingProcessModal());
    }
  }, [connectors, navigation, setGroupedConnectors, dispatch]);

  const allKeys = useSelector(({WALLET}: RootState) => WALLET.keys);

  const getWalletData = (customData?: {keyId: string; walletId: string}) => {
    const wallet =
      customData &&
      findWalletById(allKeys[customData.keyId].wallets, customData.walletId);
    return {
      name: wallet?.walletName || wallet?.currencyName,
      network: wallet?.credentials.network || '',
    };
  };
  return (
    <WalletConnectContainer>
      <ScrollView>
        <HeaderTitle>Connections</HeaderTitle>
        {Object.entries(groupedConnectors).map(([key, connectorsByKey]) => {
          let customData:
            | {
                keyId: string;
                walletId: string;
              }
            | undefined;
          for (const [, value] of Object.entries(connectorsByKey as any)) {
            customData = (value as wcConnector[])[0].customData;
          }
          return (
            <ConnectionsContainer key={key}>
              <KeyTitleContainer>
                <KeyIcon />
                <KeyTitleText>
                  {customData && allKeys[customData.keyId].keyName}
                </KeyTitleText>
              </KeyTitleContainer>
              <Hr />
              <ChainContainer>
                <ChainDetailsContainer>
                  <ChainIconContainer>
                    <EthIcon width={50} height={50} />
                  </ChainIconContainer>
                  <ChainTextContainer>
                    <H5>{getWalletData(customData).name}</H5>
                    <H7>{getWalletData(customData).network}</H7>
                  </ChainTextContainer>
                </ChainDetailsContainer>
                <AddConnectionContainer
                  onPress={async () => {
                    haptic('impactLight');
                    navigation.navigate('Scan', {
                      screen: 'Root',
                      params: {
                        contextHandler: async data => {
                          try {
                            dispatch(
                              showOnGoingProcessModal(
                                OnGoingProcessMessages.LOADING,
                              ),
                            );
                            if (isValidWalletConnectUri(data)) {
                              const peer = (await dispatch<any>(
                                walletConnectOnSessionRequest(data),
                              )) as any;
                              navigation.navigate('WalletConnect', {
                                screen: 'WalletConnectStart',
                                params: {
                                  keyId: customData?.keyId,
                                  walletId: customData?.walletId,
                                  peer,
                                },
                              });
                            }
                          } catch (e) {
                            console.log(e);
                          } finally {
                            dispatch(dismissOnGoingProcessModal());
                          }
                        },
                      },
                    });
                  }}>
                  <AddIcon width={13} />
                  <WalletConnectIcon width={25} />
                </AddConnectionContainer>
              </ChainContainer>
              {Object.entries(connectorsByKey as any).map(
                ([, wcConnectors]) => {
                  return (wcConnectors as wcConnector[]).map(c => {
                    const session = c.connector.session;
                    return (
                      <ItemContainer
                        key={session.key}
                        style={{minHeight: 37, marginTop: 16}}>
                        <ItemTitleTouchableContainer
                          onPress={async () => {
                            haptic('impactLight');
                            navigation.navigate('WalletConnect', {
                              screen: 'WalletConnectHome',
                              params: {
                                peerId: session?.peerId,
                              },
                            });
                          }}>
                          {session && session.peerMeta && (
                            <>
                              <IconContainer>
                                <Image
                                  source={{uri: session.peerMeta.icons[0]}}
                                  style={{width: 37, height: 37}}
                                />
                              </IconContainer>
                              <IconLabel>
                                {session.peerMeta.url.replace('https://', '')}
                              </IconLabel>
                            </>
                          )}
                        </ItemTitleTouchableContainer>
                        <ItemNoteTouchableContainer
                          style={{paddingRight: 10}}
                          onPress={() => {
                            haptic('impactLight');
                            dispatch(
                              showBottomNotificationModal({
                                type: 'question',
                                title: 'Confirm Delete',
                                message:
                                  'Are you sure you want to delete this connection?',
                                enableBackdropDismiss: true,
                                actions: [
                                  {
                                    text: 'DELETE',
                                    action: async () => {
                                      try {
                                        dispatch(
                                          dismissBottomNotificationModal(),
                                        );
                                        await sleep(500);
                                        dispatch(
                                          showOnGoingProcessModal(
                                            OnGoingProcessMessages.LOADING,
                                          ),
                                        );
                                        dispatch(
                                          walletConnectKillSession(
                                            session?.peerId,
                                          ),
                                        );
                                      } catch (e) {
                                        console.log(e);
                                        dispatch(dismissOnGoingProcessModal());
                                      }
                                    },
                                    primary: true,
                                  },
                                  {
                                    text: 'GO BACK',
                                    action: () => {},
                                  },
                                ],
                              }),
                            );
                          }}>
                          <TrashIcon />
                        </ItemNoteTouchableContainer>
                      </ItemContainer>
                    );
                  });
                },
              )}
            </ConnectionsContainer>
          );
        })}
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectConnections;
