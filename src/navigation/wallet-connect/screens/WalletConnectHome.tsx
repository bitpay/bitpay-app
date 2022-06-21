import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Hr} from '../../../components/styled/Containers';
import {HeaderTitle, IconLabel} from '../styled/WalletConnectText';
import {
  IconContainer,
  ItemContainer,
  ItemNoteContainer,
  ItemTitleContainer,
  ItemTouchableContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {sleep} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {
  IWCConnector,
  IWCRequest,
} from '../../../store/wallet-connect/wallet-connect.models';
import WalletConnect from '@walletconnect/client';
import {
  FormatAmount,
  FormatAmountStr,
} from '../../../store/wallet/effects/amount/amount';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {Wallet} from '../../../store/wallet/wallet.models';
import {convertHexToNumber} from '@walletconnect/utils';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {useTranslation} from 'react-i18next';

export type WalletConnectHomeParamList = {
  peerId: string;
  wallet: Wallet;
};

const SummaryContainer = styled.View`
  padding-bottom: 64px;
`;

const NoteContainer = styled.TouchableOpacity<{isDappUri?: boolean}>`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
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
  padding-bottom: 64px;
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
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const {
    params: {peerId, wallet},
  } = useRoute<RouteProp<{params: WalletConnectHomeParamList}>>();

  const wcConnector: IWCConnector | undefined = useAppSelector(
    ({WALLET_CONNECT}) => {
      return WALLET_CONNECT.connectors.find(c => c.connector.peerId === peerId);
    },
  );
  const session: WalletConnect | undefined = wcConnector?.connector;
  const requests: IWCRequest[] = useAppSelector(({WALLET_CONNECT}) => {
    return WALLET_CONNECT.requests.filter(request => request.peerId === peerId);
  });

  const goToConfirmView = (request: IWCRequest) => {
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Confirm request'),
        message: t(
          'Please check on that the request is still waiting for confirmation and the swap amount is correct before proceeding to the confirmation step.',
          {name: session?.peerMeta?.name},
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('CONTINUE'),
            action: async () => {
              try {
                dispatch(dismissBottomNotificationModal());
                await sleep(500);
                dispatch(
                  showOnGoingProcessModal(OnGoingProcessMessages.LOADING),
                );

                const {
                  to: toAddress,
                  from,
                  gasPrice,
                  gas,
                  value = '0x0',
                  nonce,
                  data,
                } = request.payload.params[0];
                const recipient = {
                  address: toAddress,
                };
                const amountStr = value
                  ? dispatch(FormatAmount('eth', parseInt(value, 16)))
                  : 0;
                const tx = {
                  wallet,
                  recipient,
                  toAddress,
                  from,
                  amount: Number(amountStr),
                  gasPrice: gasPrice && convertHexToNumber(gasPrice),
                  nonce: nonce && convertHexToNumber(nonce),
                  gasLimit: gas && convertHexToNumber(gas),
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
                    wallet,
                    recipient,
                    txp,
                    txDetails,
                    request,
                    amount: tx.amount,
                    data,
                  },
                });
              } catch (err: any) {
                const errorMessageConfig = (
                  await Promise.all([
                    dispatch(handleCreateTxProposalError(err)),
                    sleep(500),
                  ])
                )[0];
                dispatch(dismissOnGoingProcessModal());
                await sleep(500);
                dispatch(
                  showBottomNotificationModal({
                    ...errorMessageConfig,
                    enableBackdropDismiss: false,
                    actions: [
                      {
                        text: t('OK'),
                        action: () => {},
                      },
                    ],
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
    if (!wcConnector) {
      navigation.goBack();
    }
  }, [wcConnector, navigation]);

  return (
    <WalletConnectContainer>
      <ScrollView>
        <SummaryContainer>
          <HeaderTitle>{t('Summary')}</HeaderTitle>
          <Hr />
          <ItemContainer>
            <H7>{t('Connected to')}</H7>
            {session && session.peerMeta ? (
              <ClipboardContainer>
                {clipboardObj.copied && clipboardObj.type === 'dappUri' ? (
                  <CopiedSvg width={17} />
                ) : null}
                <NoteContainer
                  isDappUri={true}
                  disabled={clipboardObj.copied}
                  onPress={() =>
                    session.peerMeta
                      ? copyToClipboard(session.peerMeta.url, 'dappUri')
                      : null
                  }>
                  <IconContainer>
                    <FastImage
                      source={{uri: session.peerMeta.icons[0]}}
                      style={{width: 18, height: 18}}
                    />
                  </IconContainer>
                  <NoteLabel numberOfLines={1} ellipsizeMode={'tail'}>
                    {session.peerMeta.url.replace('https://', '')}
                  </NoteLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
          <ItemContainer>
            <H7>{t('Linked Wallet')}</H7>
            {session && session.accounts && session.accounts[0] ? (
              <ClipboardContainer>
                {clipboardObj.copied && clipboardObj.type === 'address' ? (
                  <CopiedSvg width={17} />
                ) : null}
                <NoteContainer
                  disabled={clipboardObj.copied}
                  onPress={() =>
                    copyToClipboard(session.accounts[0], 'address')
                  }>
                  <IconContainer>
                    <EthIcon width={18} height={18} />
                  </IconContainer>
                  <NoteLabel numberOfLines={1} ellipsizeMode={'middle'}>
                    {session.accounts[0]}
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
          {requests && requests.length ? (
            requests.map((request, id) => {
              const {value = '0x0'} = request.payload.params[0];
              const amountStr = dispatch(
                FormatAmountStr('eth', parseInt(value, 16)),
              );
              return (
                <View key={id}>
                  <ItemTouchableContainer
                    onPress={() => {
                      haptic('impactLight');
                      request.payload.method !== 'eth_sendTransaction' &&
                      request.payload.method !== 'eth_signTransaction'
                        ? navigation.navigate('WalletConnect', {
                            screen: 'WalletConnectRequestDetails',
                            params: {
                              peerId,
                              requestId: request.payload.id,
                              wallet,
                              peerName: session?.peerMeta?.name,
                            },
                          })
                        : goToConfirmView(request);
                    }}>
                    <ItemTitleContainer>
                      {session && session.peerMeta ? (
                        <>
                          <IconContainer>
                            <FastImage
                              source={{uri: session.peerMeta.icons[0]}}
                              style={{width: 25, height: 25}}
                            />
                          </IconContainer>
                          <IconLabel numberOfLines={2} ellipsizeMode={'tail'}>
                            {session.peerMeta.name}
                          </IconLabel>
                        </>
                      ) : null}
                    </ItemTitleContainer>
                    <ItemNoteContainer>
                      <IconLabel>{amountStr}</IconLabel>
                      <IconContainer>
                        <AngleRight />
                      </IconContainer>
                    </ItemNoteContainer>
                  </ItemTouchableContainer>
                  <Hr />
                </View>
              );
            })
          ) : (
            <ItemContainer>
              <ItemTitleContainer>
                <H7>{t('No pending requests')}</H7>
              </ItemTitleContainer>
            </ItemContainer>
          )}
        </PRContainer>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectHome;
