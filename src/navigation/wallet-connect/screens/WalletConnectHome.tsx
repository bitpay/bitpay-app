import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {H7, Smallest} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import MaticIcon from '../../../../assets/img/currencies/matic.svg';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Hr} from '../../../components/styled/Containers';
import {HeaderTitle, IconLabel} from '../styled/WalletConnectText';
import {
  IconContainer,
  ItemContainer,
  ItemNoteContainer,
  ItemNoteTouchableContainer,
  ItemTitleContainer,
  ItemTouchableContainer,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {FlatList, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {sleep} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {
  FormatAmount,
  FormatAmountStr,
} from '../../../store/wallet/effects/amount/amount';
import {createProposalAndBuildTxDetails} from '../../../store/wallet/effects/send/send';
import {Wallet} from '../../../store/wallet/wallet.models';
import {useTranslation} from 'react-i18next';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  getAddressFrom,
  walletConnectV2OnUpdateSession,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {
  GetAmFormatDate,
  GetAmTimeAgo,
  WithinPastDay,
} from '../../../store/wallet/utils/time';
import {
  WCV2RequestType,
  WCV2SessionType,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {WALLET_CONNECT_SUPPORTED_CHAINS} from '../../../constants/WalletConnectV2';
import {
  IWCConnector,
  IWCRequest,
} from '../../../store/wallet-connect/wallet-connect.models';
import WalletConnect from '@walletconnect/client';
import {RootState} from '../../../store';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {WalletConnectHeader} from '../WalletConnectStack';
import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';

export type WalletConnectHomeParamList = {
  topic?: string;
  peerId?: string;
  wallet: Wallet;
};

const SummaryContainer = styled.View`
  padding-bottom: 64px;
`;

const NoteContainer = styled.TouchableOpacity<{isDappUri?: boolean}>`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  max-width: ${({isDappUri}) => (isDappUri ? '175px' : '126px')};
  justify-content: center;
  flex-direction: row;
  align-items: center;
  padding: 10px 20px;
`;

const NoteLabel = styled(H7)`
  margin-left: 5px;
`;

const PRContainer = styled.View`
  flex: 1;
`;

const ClipboardContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const WalletConnectHome = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [accountDisconnected, setAccountDisconnected] = useState(false);
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const {
    params: {topic, wallet, peerId},
  } = useRoute<RouteProp<{params: WalletConnectHomeParamList}>>();
  const version: number = peerId ? 1 : 2;
  // version 1
  const connectorV1: IWCConnector | undefined = useAppSelector(
    ({WALLET_CONNECT}) => {
      return WALLET_CONNECT.connectors.find(c => c.connector.peerId === peerId);
    },
  );
  const sessionV1: WalletConnect | undefined = connectorV1?.connector;
  const requestsV1 = useAppSelector(({WALLET_CONNECT}) => {
    return WALLET_CONNECT.requests.filter(request => request.peerId === peerId);
  });

  // version 2
  const sessionV2: WCV2SessionType | undefined = useAppSelector(
    ({WALLET_CONNECT_V2}) =>
      WALLET_CONNECT_V2.sessions.find(session => session.topic === topic),
  );
  const requestsV2 = useAppSelector(({WALLET_CONNECT_V2}) =>
    WALLET_CONNECT_V2.requests.filter(
      request =>
        request.topic === topic &&
        getAddressFrom(request) === wallet.receiveAddress &&
        WALLET_CONNECT_SUPPORTED_CHAINS[request.params.chainId].chain ===
          wallet.chain,
    ),
  );

  let peerName: string | undefined;
  let peerIcon: string | undefined;
  let peerUrl: string | undefined;

  if (version === 1) {
    peerName = sessionV1?.peerMeta?.name;
    peerIcon = sessionV1?.peerMeta?.icons[0];
    peerUrl = sessionV1?.peerMeta?.url;
  } else {
    peerName = sessionV2?.peer.metadata.name;
    peerIcon = sessionV2?.peer.metadata.icons[0];
    peerUrl = sessionV2?.peer.metadata.url;
  }

  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);

  const {chain, currencyAbbreviation, receiveAddress} = wallet;
  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const disconnectAccount = async () => {
    haptic('impactLight');
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Confirm delete'),
        message: t('Are you sure you want to delete this connection?'),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('DELETE'),
            action: async () => {
              try {
                if (sessionV2) {
                  dispatch(dismissBottomNotificationModal());
                  await sleep(600);
                  dispatch(startOnGoingProcessModal('LOADING'));
                  await sleep(600);
                  await dispatch(
                    walletConnectV2OnUpdateSession({
                      session: sessionV2,
                      address: receiveAddress,
                      action: 'disconnect',
                    }),
                  );
                  dispatch(dismissOnGoingProcessModal());
                  await sleep(600);
                  setAccountDisconnected(true);
                }
              } catch (err) {
                dispatch(dismissOnGoingProcessModal());
                await sleep(500);
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
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
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => WalletConnectHeader(),
      headerRight: () => {
        return version === 2 ? (
          <ItemNoteTouchableContainer
            style={{marginRight: 12}}
            onPress={() => {
              disconnectAccount();
            }}>
            <TrashIcon />
          </ItemNoteTouchableContainer>
        ) : null;
      },
    });
  }, [navigation, disconnectAccount, t, version]);

  const goToConfirmView = async (request: any) => {
    try {
      let _wallet;
      dispatch(dismissBottomNotificationModal());
      await sleep(500);
      dispatch(startOnGoingProcessModal('LOADING'));
      if (
        request.chain &&
        request.chain !== wallet.chain &&
        connectorV1?.customData.keyId
      ) {
        _wallet = allKeys[connectorV1?.customData.keyId].wallets.find(w => {
          return (
            w.chain === request?.chain &&
            w.credentials.account === wallet.credentials.account
          );
        });
        if (!_wallet) {
          const errMsg = t('WCNoWalletMsg', {
            chain: request.chain?.toUpperCase(),
          });
          throw new Error(errMsg);
        }
      }
      const {
        to: toAddress,
        from,
        gasPrice,
        gasLimit,
        value,
        nonce,
        data,
      } = request.payload
        ? request.payload.params[0]
        : request.params.request.params[0];

      const recipient = {
        address: toAddress,
      };

      const amountStr = value
        ? dispatch(
            FormatAmount(currencyAbbreviation, chain, parseInt(value, 16)),
          )
        : 0;

      const tx = {
        wallet: _wallet || wallet,
        recipient,
        toAddress,
        from,
        amount: Number(amountStr),
        gasPrice: parseInt(gasPrice, 16),
        nonce: parseInt(nonce, 16),
        gasLimit: parseInt(gasLimit, 16),
        data,
        customData: {
          service: 'walletConnect',
        },
      };
      const {txDetails, txp} = (await dispatch<any>(
        createProposalAndBuildTxDetails(tx),
      )) as any;
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      navigation.navigate('WalletConnect', {
        screen: 'WalletConnectConfirm',
        params: {
          wallet: _wallet || wallet,
          recipient,
          txp,
          txDetails,
          request,
          amount: tx.amount,
          data,
          peerName,
          version: peerId ? 1 : 2,
          peerId,
        },
      });
    } catch (error: any) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(error.err ? error.err : error),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  const copyToClipboard = (value: string, type: string) => {
    haptic('impactLight');
    if (!clipboardObj.copied && value) {
      Clipboard.setString(value);
      setClipboardObj({copied: true, type});

      setTimeout(() => {
        setClipboardObj({copied: false, type});
      }, 3000);
    }
  };

  useEffect(() => {
    if (!clipboardObj.copied) {
      return;
    }
    const timer = setTimeout(() => {
      setClipboardObj({copied: false, type: clipboardObj.type});
    }, 3000);

    return () => clearTimeout(timer);
  }, [clipboardObj]);

  useEffect(() => {
    if (!sessionV1 && !sessionV2) {
      setAccountDisconnected(true);
    }
  }, [sessionV1, sessionV2]);

  useEffect(() => {
    if (accountDisconnected) {
      navigation.goBack();
    }
  }, [accountDisconnected]);

  const renderItem = useCallback(({item, index}) => {
    const {createdOn, peerId: undefined, chain: _chain} = item;
    const {value = '0x0'} = item.payload
      ? item.payload.params[0]
      : item.params.request.params[0];
    const amountStr = dispatch(
      FormatAmountStr(
        _chain || currencyAbbreviation,
        _chain || chain,
        parseInt(value, 16),
      ),
    );
    const method = item.payload
      ? item.payload.method
      : item.params.request.method;

    return (
      <View key={index.toString()}>
        <ItemTouchableContainer
          onPress={() => {
            haptic('impactLight');
            method !== 'eth_sendTransaction' && method !== 'eth_signTransaction'
              ? navigation.navigate('WalletConnect', {
                  screen: 'WalletConnectRequestDetails',
                  params: {
                    request: item.payload ? item.payload : item,
                    wallet,
                    peerName,
                    version: item.payload ? 1 : 2,
                    peerId,
                    topic,
                  },
                })
              : goToConfirmView(item);
          }}>
          <ItemTitleContainer style={{maxWidth: '40%'}}>
            {peerIcon && peerName ? (
              <>
                <IconContainer>
                  <FastImage
                    source={{uri: peerIcon}}
                    style={{width: 25, height: 25}}
                  />
                </IconContainer>
                <IconLabel numberOfLines={2} ellipsizeMode={'tail'}>
                  {peerName}
                </IconLabel>
              </>
            ) : null}
          </ItemTitleContainer>
          <ItemNoteContainer>
            <View style={{alignItems: 'flex-end'}}>
              <IconLabel>{amountStr}</IconLabel>
              {createdOn &&
                (WithinPastDay(createdOn) ? (
                  <Smallest style={{marginRight: 12}}>
                    {t('Created ', {
                      date: GetAmTimeAgo(createdOn),
                    })}
                  </Smallest>
                ) : (
                  <Smallest style={{marginRight: 12}}>
                    {t('Created on', {
                      date: GetAmFormatDate(createdOn),
                    })}
                  </Smallest>
                ))}
            </View>
            <IconContainer>
              <AngleRight />
            </IconContainer>
          </ItemNoteContainer>
        </ItemTouchableContainer>
        <Hr />
      </View>
    );
  }, []);

  return (
    <WalletConnectContainer>
      <View style={{marginTop: 20, padding: 16, flex: 1}}>
        <SummaryContainer>
          <HeaderTitle>{t('Summary')}</HeaderTitle>
          <Hr />
          <ItemContainer>
            <H7>{t('Connected to')}</H7>
            {peerUrl && peerIcon ? (
              <ClipboardContainer>
                {clipboardObj.copied && clipboardObj.type === 'dappUri' ? (
                  <CopiedSvg width={17} />
                ) : null}
                <NoteContainer
                  isDappUri={true}
                  disabled={clipboardObj.copied}
                  onPress={() =>
                    peerUrl ? copyToClipboard(peerUrl, 'dappUri') : null
                  }>
                  <IconContainer>
                    <FastImage
                      source={{uri: peerIcon}}
                      style={{width: 18, height: 18}}
                    />
                  </IconContainer>
                  <NoteLabel numberOfLines={1} ellipsizeMode={'tail'}>
                    {peerUrl?.replace('https://', '')}
                  </NoteLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
          <ItemContainer>
            <H7>{t('Linked Wallet')}</H7>
            {wallet.receiveAddress ? (
              <ClipboardContainer>
                {clipboardObj.copied && clipboardObj.type === 'address' ? (
                  <CopiedSvg width={17} />
                ) : null}
                <NoteContainer
                  disabled={clipboardObj.copied}
                  onPress={() =>
                    copyToClipboard(wallet.receiveAddress!, 'address')
                  }>
                  <IconContainer>
                    {chain === 'eth' ? (
                      <EthIcon width={18} height={18} />
                    ) : (
                      <MaticIcon width={18} height={18} />
                    )}
                  </IconContainer>
                  <NoteLabel numberOfLines={1} ellipsizeMode={'middle'}>
                    {wallet.receiveAddress}
                  </NoteLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
        </SummaryContainer>
        <PRContainer>
          <HeaderTitle>{t('Pending Requests')}</HeaderTitle>
          <Hr />
          {(requestsV1 && requestsV1.length) ||
          (requestsV2 && requestsV2.length) ? (
            <FlatList
              data={
                requestsV1 && requestsV1.length
                  ? requestsV1
                  : requestsV2 && requestsV2.length
                  ? requestsV2
                  : ([] as any[])
              }
              keyExtractor={(_item, index) => index.toString()}
              renderItem={({
                item,
                index,
              }: {
                item: WCV2RequestType | IWCRequest;
                index: number;
              }) => renderItem({item, index})}
            />
          ) : (
            <ItemContainer>
              <ItemTitleContainer>
                <H7>{t('No pending requests')}</H7>
              </ItemTitleContainer>
            </ItemContainer>
          )}
        </PRContainer>
      </View>
    </WalletConnectContainer>
  );
};

export default WalletConnectHome;
