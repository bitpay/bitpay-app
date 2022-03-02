import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {useDispatch, useSelector} from 'react-redux';
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
import {RootState} from '../../../store';
import {Image, View} from 'react-native';
import {sleep} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {
  IWCConnector,
  IWCRequest,
} from '../../../store/wallet-connect/wallet-connect.models';
import WalletConnect from '@walletconnect/client';

export type WalletConnectHomeParamList = {
  peerId: string;
};

const SummaryContainer = styled.View`
  padding-bottom: 64px;
`;

const NoteContainer = styled.TouchableOpacity<{isDappUri?: boolean}>`
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  max-width: ${({isDappUri}) => (isDappUri ? '175px' : '126px')};
  justify-content: flex-start;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
  margin-left: 2px;
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
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const {
    params: {peerId},
  } = useRoute<RouteProp<{params: WalletConnectHomeParamList}>>();

  const wcConnector: IWCConnector | undefined = useSelector(
    ({WALLET_CONNECT}: RootState) => {
      return WALLET_CONNECT.connectors.find(c => c.connector.peerId === peerId);
    },
  );
  const session: WalletConnect | undefined = wcConnector?.connector;
  const requests: IWCRequest[] = useSelector(({WALLET_CONNECT}: RootState) => {
    return WALLET_CONNECT.requests.filter(request => request.peerId === peerId);
  });

  const goToConfirmView = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: 'Confirm Request',
        message:
          'Please check on WalletConnect Example that the request is still waiting for confirmation and the swap amount is correct before proceeding to the confirmation step.',
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'CONTINUE',
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(300);
              // TODO: go to confirm view
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
          <HeaderTitle>Summary</HeaderTitle>
          <Hr />
          <ItemContainer>
            <H7>Connected to</H7>
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
                    <Image
                      source={{uri: session.peerMeta.icons[0]}}
                      style={{width: 18, height: 18}}
                    />
                  </IconContainer>
                  <IconLabel numberOfLines={1} ellipsizeMode={'tail'}>
                    {session.peerMeta.url.replace('https://', '')}
                  </IconLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
          <ItemContainer>
            <H7>Linked Wallet</H7>
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
                  <IconLabel numberOfLines={1} ellipsizeMode={'middle'}>
                    {session.accounts[0]}
                  </IconLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
        </SummaryContainer>
        <PRContainer>
          <HeaderTitle>Pending Requests</HeaderTitle>
          <Hr />
          {requests && requests.length ? (
            requests.map(request => {
              return (
                <View key={request.payload.id}>
                  <ItemTouchableContainer
                    onPress={() => {
                      haptic('impactLight');
                      request.payload.method !== 'eth_sendTransaction'
                        ? navigation.navigate('WalletConnect', {
                            screen: 'WalletConnectRequestDetails',
                            params: {
                              peerId,
                              requestId: request.payload.id,
                            },
                          })
                        : goToConfirmView();
                    }}>
                    <ItemTitleContainer>
                      {session && session.peerMeta ? (
                        <>
                          <IconContainer>
                            <Image
                              source={{uri: session.peerMeta.icons[0]}}
                              style={{width: 25, height: 25}}
                            />
                          </IconContainer>
                          <IconLabel>{session.peerMeta.name}</IconLabel>
                        </>
                      ) : null}
                    </ItemTitleContainer>
                    <ItemNoteContainer>
                      {request.payload.method === 'eth_signTransaction' ||
                      request.payload.method === 'eth_sendTransaction' ? (
                        <IconLabel>
                          {parseInt(request.payload.params[0].value, 16)} ETH
                        </IconLabel>
                      ) : (
                        <IconLabel>0.00 ETH</IconLabel>
                      )}
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
                <H7>No pending requests</H7>
              </ItemTitleContainer>
            </ItemContainer>
          )}
        </PRContainer>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectHome;
