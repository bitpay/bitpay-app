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
import Clipboard from '@react-native-clipboard/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {FormatAmountStr} from '../../../store/wallet/effects/amount/amount';
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
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {WalletConnectHeader} from '../WalletConnectStack';
import TrashIcon from '../../../../assets/img/wallet-connect/trash-icon.svg';
import {InAppNotificationContextType} from '../../../store/app/app.models';

export type WalletConnectHomeParamList = {
  topic?: string;
  wallet: Wallet;
  context?: InAppNotificationContextType;
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
    params: {topic, wallet, context},
  } = useRoute<RouteProp<{params: WalletConnectHomeParamList}>>();

  // version 2
  const sessionV2: WCV2SessionType | undefined = useAppSelector(
    ({WALLET_CONNECT_V2}) =>
      WALLET_CONNECT_V2.sessions.find(session => session.topic === topic),
  );
  const requestsV2 = useAppSelector(({WALLET_CONNECT_V2}) =>
    WALLET_CONNECT_V2.requests
      .filter(request => {
        const addressFrom = getAddressFrom(request)?.toLowerCase();
        const filterWithAddress = addressFrom
          ? addressFrom === wallet.receiveAddress?.toLowerCase()
          : true; // if address exist in request check if it matches with connected wallets addresses
        const walletConnectChain =
          WALLET_CONNECT_SUPPORTED_CHAINS[request?.params.chainId]?.chain;
        return (
          request.topic === topic &&
          filterWithAddress &&
          walletConnectChain === wallet.chain
        );
      })
      .reverse(),
  );

  const {peer} = sessionV2 || {};
  const {name: peerName, icons, url: peerUrl} = peer?.metadata || {};
  const peerIcon = icons && icons[0];

  const {chain, currencyAbbreviation, receiveAddress, tokenAddress} = wallet;
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
        message: t(
          'Are you sure you want to delete this account from the connection?',
        ),
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
        return (
          <ItemNoteTouchableContainer
            onPress={() => {
              disconnectAccount();
            }}>
            <TrashIcon />
          </ItemNoteTouchableContainer>
        );
      },
    });
  }, [navigation, disconnectAccount, t]);

  const goToConfirmView = async (request: any) => {
    try {
      let _wallet;
      dispatch(dismissBottomNotificationModal());
      await sleep(500);

      const {to: toAddress} = request.params.request.params[0];

      const recipient = {
        address: toAddress,
      };

      navigation.navigate('WalletConnect', {
        screen: 'WalletConnectConfirm',
        params: {
          wallet: _wallet || wallet,
          recipient,
          request,
          peerName,
        },
      });
    } catch (error: any) {
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

  const handleRequestMethod = (request: WCV2RequestType) => {
    const {method} = request.params.request;
    method !== 'eth_sendTransaction' && method !== 'eth_signTransaction'
      ? navigation.navigate('WalletConnect', {
          screen: 'WalletConnectRequestDetails',
          params: {
            request,
            wallet,
            peerName,
            topic,
          },
        })
      : goToConfirmView(request);
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
    if (!sessionV2) {
      setAccountDisconnected(true);
    }
  }, [sessionV2]);

  useEffect(() => {
    if (accountDisconnected) {
      navigation.goBack();
    }
  }, [accountDisconnected]);

  useEffect(() => {
    if (context && ['notification'].includes(context) && requestsV2[0]) {
      handleRequestMethod(requestsV2[0]);
    }
  }, [context]);

  const renderItem = useCallback(
    ({item, index}: {item: WCV2RequestType; index: number}) => {
      const {createdOn, chain: _chain} = item;
      const {value = '0x0'} = item.params.request.params[0];
      const amountStr = dispatch(
        FormatAmountStr(
          _chain || currencyAbbreviation,
          _chain || chain,
          tokenAddress,
          parseInt(value, 16),
        ),
      );

      return (
        <View key={index.toString()}>
          <ItemTouchableContainer
            onPress={() => {
              haptic('impactLight');
              handleRequestMethod(item);
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
    },
    [],
  );

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
          {requestsV2 && requestsV2.length ? (
            <FlatList
              data={
                requestsV2 && requestsV2.length ? requestsV2 : ([] as any[])
              }
              keyExtractor={(_item, index) => index.toString()}
              renderItem={({
                item,
                index,
              }: {
                item: WCV2RequestType;
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
