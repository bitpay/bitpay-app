import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useLayoutEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {BaseText, H5} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import AddConnection from '../../../components/add/Add';
import {HeaderTitle} from '../styled/WalletConnectText';
import {
  IconContainer,
  ItemContainer,
  ItemNoteContainer,
  ItemNoteTouchableContainer,
  ItemTitleContainer,
} from '../styled/WalletConnectContainers';
import {Platform, ScrollView, View} from 'react-native';
import Connections from '../components/Connections';
import {useTranslation} from 'react-i18next';
import FastImage from 'react-native-fast-image';
import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {sleep} from '../../../utils/helper-methods';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {
  walletConnectV2OnDeleteSession,
  walletConnectV2OnUpdateSession,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import WCV2WalletSelector from '../components/WCV2WalletSelector';
import {WCV2SessionType} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import PlusIcon from '../../../components/plus/Plus';
import {AddButton} from '../../wallet/screens/CreateMultisig';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {ignoreGlobalListContextList} from '../../../components/modal/chain-selector/ChainSelector';

const WalletConnectConnectionsContainer = styled.SafeAreaView`
  flex: 1;
`;

const DappTitleText = styled(BaseText)`
  font-size: 14px;
  font-weight: 700;
  line-height: 14px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  padding-right: 12px;
  padding-left: 6px;
  padding-top: ${Platform.OS === 'ios' ? '4px' : '8px'};
`;

const AddConnectionContainer = styled.TouchableOpacity``;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const WalletConnectConnections = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  // version 2
  const sessions: WCV2SessionType[] = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.sessions,
  );

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as WCV2SessionType[]);
  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes('walletconnect')
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const [dappProposal, setDappProposal] = useState<any>();
  const [sessionToUpdate, setSessionToUpdate] = useState<WCV2SessionType>();
  const [walletSelectorV2ModalVisible, setWalletSelectorV2ModalVisible] =
    useState(false);
  const showWalletSelectorV2 = () => setWalletSelectorV2ModalVisible(true);
  const hideWalletSelectorV2 = () => setWalletSelectorV2ModalVisible(false);

  const dispatch = useAppDispatch();
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const accountRegex = /0x[a-fA-F0-9]{40}/;

  const ConnectionItem = ({
    peerName,
    peerIcon,
    session,
  }: {
    peerName: string;
    peerIcon: string;
    session?: WCV2SessionType;
  }) => {
    return (
      <ItemContainer style={{minHeight: 20}}>
        <ItemTitleContainer>
          <IconContainer>
            <FastImage
              source={{uri: peerIcon}}
              style={{width: 18, height: 18}}
            />
          </IconContainer>
          <DappTitleText>{peerName}</DappTitleText>
        </ItemTitleContainer>
        <ItemNoteContainer>
          {session ? (
            <AddButton
              style={{marginRight: 10}}
              onPress={async () => {
                setSessionToUpdate(session);
                showWalletSelectorV2();
              }}>
              <PlusIcon />
            </AddButton>
          ) : null}
          <ItemNoteTouchableContainer
            onPress={() => {
              haptic('impactLight');
              dispatch(
                showBottomNotificationModal({
                  type: 'question',
                  title: t('Confirm delete'),
                  message: t(
                    'Are you sure you want to delete this connection?',
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t('DELETE'),
                      action: async () => {
                        try {
                          dispatch(dismissBottomNotificationModal());
                          await sleep(500);
                          dispatch(startOnGoingProcessModal('LOADING'));
                          const {topic, pairingTopic} = session || {};
                          if (topic && pairingTopic) {
                            await dispatch(
                              walletConnectV2OnDeleteSession(
                                topic,
                                pairingTopic,
                              ),
                            );
                          }
                        } catch (e) {
                          await showErrorMessage(
                            CustomErrorMessage({
                              errMsg: BWCErrorMessage(e),
                              title: t('Uh oh, something went wrong'),
                            }),
                          );
                        } finally {
                          dispatch(dismissOnGoingProcessModal());
                          await sleep(500);
                        }
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {},
                    },
                  ],
                }),
              );
            }}>
            <TrashIcon />
          </ItemNoteTouchableContainer>
        </ItemNoteContainer>
      </ItemContainer>
    );
  };
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <AddConnectionContainer
            onPress={() => {
              navigation.navigate('WalletConnectRoot', {});
            }}>
            <AddConnection opacity={1} />
          </AddConnectionContainer>
        );
      },
    });
  }, [navigation]);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const SessionList = ({sessions}: {sessions: WCV2SessionType[]}) => {
    return (
      <>
        {sessions.map((session, index) => {
          const {peer, namespaces, accounts} = session;
          return (
            <View style={{marginVertical: 15}} key={index.toString()}>
              <ConnectionItem
                peerIcon={peer.metadata.icons[0]}
                peerName={peer.metadata.name}
                session={session}
              />
              {Object.keys(namespaces).length
                ? Object.keys(namespaces).map(key => {
                    return namespaces[key].accounts
                      .sort((a, b) => {
                        const getAddress = (str: string) =>
                          str.match(accountRegex)?.[0];
                        return (getAddress(a) || '').localeCompare(
                          getAddress(b) || '',
                        );
                      })
                      .filter(account => accounts.includes(account))
                      .map((account, subIndex) => (
                        <Connections
                          keys={allKeys}
                          account={account}
                          session={session}
                          key={subIndex.toString()}
                        />
                      ));
                  })
                : null}
            </View>
          );
        })}
      </>
    );
  };

  return (
    <WalletConnectConnectionsContainer>
      <ScrollView>
        <View style={{marginTop: 20, padding: 16}}>
          <HeaderTitle>{t('Connections')}</HeaderTitle>
          <SearchComponent<WCV2SessionType>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={sessions}
            context={'walletconnect'}
          />
          {sessions.length ? (
            <SessionList
              sessions={
                !searchVal && !selectedChainFilterOption
                  ? sessions
                  : searchResults
              }
            />
          ) : null}
          {!sessions.length ? (
            <EmptyListContainer>
              <H5>{t("It's a ghost town in here")}</H5>
              <GhostSvg style={{marginTop: 20}} />
            </EmptyListContainer>
          ) : null}

          {dappProposal || sessionToUpdate ? (
            <WCV2WalletSelector
              isVisible={walletSelectorV2ModalVisible}
              proposal={dappProposal}
              session={sessionToUpdate}
              onBackdropPress={async (
                selectedWallets?: {
                  chain: string;
                  address: string;
                  network: string;
                  supportedChain: string;
                }[],
                session?: WCV2SessionType,
              ) => {
                hideWalletSelectorV2();
                await sleep(500);
                if (selectedWallets && selectedWallets.length > 0 && session) {
                  try {
                    dispatch(startOnGoingProcessModal('LOADING'));
                    await sleep(500);
                    await dispatch(
                      walletConnectV2OnUpdateSession({
                        session,
                        selectedWallets,
                        action: 'add_accounts',
                      }),
                    );
                    dispatch(dismissOnGoingProcessModal());
                    await sleep(500);
                  } catch (err) {
                    dispatch(dismissOnGoingProcessModal());
                    await sleep(500);
                    await showErrorMessage(
                      CustomErrorMessage({
                        errMsg: BWCErrorMessage(err),
                        title: t('Uh oh, something went wrong'),
                      }),
                    );
                  } finally {
                    setDappProposal(undefined);
                    setSessionToUpdate(undefined);
                  }
                }
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </WalletConnectConnectionsContainer>
  );
};

export default WalletConnectConnections;
