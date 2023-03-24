import React, {useCallback, useEffect, useState} from 'react';
import {Platform} from 'react-native';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../components/button/Button';
import {
  ActionContainer,
  CtaContainer,
  Hr,
  Info,
} from '../../../components/styled/Containers';
import {
  H7,
  InfoDescription,
  InfoHeader,
  InfoTitle,
} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {
  ItemContainer,
  ItemTitleContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {HeaderTitle} from '../styled/WalletConnectText';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useAppDispatch} from '../../../utils/hooks';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {Wallet} from '../../../store/wallet/wallet.models';
import {sleep} from '../../../utils/helper-methods';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';
import {GetAmFormatDate} from '../../../store/wallet/utils/time';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  walletConnectV2ApproveCallRequest,
  walletConnectV2RejectCallRequest,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {
  walletConnectApproveCallRequest,
  walletConnectPersonalSign,
  walletConnectRejectCallRequest,
  walletConnectSignTypedData,
  walletConnectSignTypedDataLegacy,
  walletConnectUpdateSession,
} from '../../../store/wallet-connect/wallet-connect.effects';
import {EVM_BLOCKCHAIN_ID, PROTOCOL_NAME} from '../../../constants/config';

export type WalletConnectRequestDetailsParamList = {
  request: any;
  wallet: Wallet;
  peerName?: string;
  version: number;
  peerId?: string;
  topic?: string;
};

const RequestDetailsContainer = styled.View`
  padding-bottom: 60px;
`;

const AddressContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 0;
`;

const AddressTextContainer = styled.TouchableOpacity`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  width: 103px;
  justify-content: center;
  padding-right: 13px;
  padding-left: 17px;
  padding-top: ${Platform.OS === 'ios' ? '4px' : 0};
  flex-direction: row;
  align-items: center;
  margin-left: 2px;
`;

const MessageTitleContainer = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0;
`;

const MessageNoteContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const MessageTextContainer = styled.TouchableOpacity`
  align-items: flex-start;
  max-width: 242px;
  justify-content: center;
  margin-left: 2px;
`;

const InfoSubTitle = styled(InfoTitle)`
  font-style: italic;
`;

const WalletConnectRequestDetails = () => {
  const {t} = useTranslation();
  const {
    params: {request: _request, wallet, peerName, version, peerId, topic},
  } = useRoute<RouteProp<{params: WalletConnectRequestDetailsParamList}>>();
  const dispatch = useAppDispatch();
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isMethodSupported, setIsMethodSupported] = useState<boolean>();
  const [methodNotSupportedMsg, setMethodNotSupportedMsg] = useState<string>();
  const [approveButtonState, setApproveButtonState] = useState<ButtonState>();
  const [rejectButtonState, setRejectButtonState] = useState<ButtonState>();
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const navigation = useNavigation();
  const request = version === 1 ? _request : _request.params.request;

  useEffect(() => {
    if (!request) {
      return;
    }

    switch (request.method) {
      case 'eth_signTypedData':
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'eth_sign':
        setAddress(request.params[0]);
        setMessage(request.params[1]);
        setIsMethodSupported(true);
        break;
      case 'personal_sign':
        setAddress(request.params[1]);
        setMessage(request.params[0]);
        setIsMethodSupported(true);
        break;
      case 'wallet_switchEthereumChain':
        const _chainId = parseInt(request.params[0].chainId, 16);
        const chain = Object.keys(EVM_BLOCKCHAIN_ID).find(
          key => EVM_BLOCKCHAIN_ID[key] === _chainId,
        );
        setIsMethodSupported(!!chain);
        if (!chain) {
          const msg = t('WCNotSupportedChainMsg', {peerName});
          setMethodNotSupportedMsg(msg);
        }
        setMessage(t('WCSwitchEthereumChainMsg', {peerName}));
        break;
      case 'wallet_switchEthereumChain':
        setIsMethodSupported(false);
        setMethodNotSupportedMsg(
          t(
            'wants to change network to a different one than the selected wallet. Please, try connecting to a different DeFi or DApp.',
            {peerName},
          ),
        );
        break;
      default:
        const defaultErrorMsg = t(
          'Sorry, we currently do not support this method.',
        );
        setIsMethodSupported(false);
        setMethodNotSupportedMsg(defaultErrorMsg);
        break;
    }
  }, [
    request,
    peerName,
    setAddress,
    setMessage,
    setIsMethodSupported,
    setMethodNotSupportedMsg,
    t,
  ]);

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

  const goToWalletConnectHome = async (newLinkedWallet?: Wallet) => {
    await sleep(500);
    navigation.navigate('WalletConnect', {
      screen: 'WalletConnectHome',
      params: {
        peerId,
        topic,
        wallet: newLinkedWallet || wallet,
      },
    });
  };

  const rejectRequest = async () => {
    try {
      setRejectButtonState('loading');
      if (version === 1) {
        const response = {
          id: request.id,
          error: {message: t('User rejected call request')},
        };
        await dispatch(walletConnectRejectCallRequest(peerId!, response));
      } else {
        await dispatch(walletConnectV2RejectCallRequest(_request));
      }
      setRejectButtonState('success');
      dispatch(Analytics.track('WalletConnect Request Rejected', {}));
      goToWalletConnectHome();
    } catch (e) {
      setRejectButtonState('failed');
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(e),
          title: t('Uh oh, something went wrong'),
          action: () => {
            setRejectButtonState(undefined);
          },
        }),
      );
    }
  };

  const approveRequest = async () => {
    try {
      haptic('impactLight');
      if (!request) {
        return;
      }
      let newLinkedWallet;
      setApproveButtonState('loading');
      if (version === 1) {
        let result: any;
        if (
          (wallet.receiveAddress &&
            wallet.receiveAddress.toLowerCase() === address.toLowerCase()) ||
          request.method === 'wallet_switchEthereumChain'
        ) {
          switch (request.method) {
            case 'eth_signTypedData':
            case 'eth_signTypedData_v3':
            case 'eth_signTypedData_v4':
              result = (await dispatch<any>(
                walletConnectSignTypedData(JSON.parse(message), wallet),
              )) as any;
              break;
            case 'eth_signTypedData_v1':
              result = (await dispatch<any>(
                walletConnectSignTypedDataLegacy(message, wallet),
              )) as any;
              break;
            case 'personal_sign':
            case 'eth_sign':
              result = (await dispatch<any>(
                walletConnectPersonalSign(message, wallet),
              )) as any;
              break;
            case 'wallet_switchEthereumChain':
              const allowSwitchNetwork = await showSwitchNetworkWarningMsg();
              await sleep(500);
              if (allowSwitchNetwork) {
                newLinkedWallet = (await dispatch<any>(
                  walletConnectUpdateSession(
                    wallet,
                    request.params[0].chainId,
                    peerId!,
                  ),
                )) as any;

                if (newLinkedWallet) {
                  result = (await dispatch<any>(
                    walletConnectPersonalSign(
                      request.params[0].chainId,
                      wallet,
                    ),
                  )) as any;
                } else {
                  setApproveButtonState(undefined);
                  return;
                }
              } else {
                throw 'user rejection';
              }
              break;
            default:
              throw methodNotSupportedMsg;
          }
        } else {
          throw t('Address requested does not match active account');
        }
        await dispatch(
          walletConnectApproveCallRequest(peerId!, {
            id: request.id,
            result,
          }),
        );
      } else {
        await dispatch(walletConnectV2ApproveCallRequest(_request, wallet));
      }
      setApproveButtonState('success');
      dispatch(Analytics.track('WalletConnect Request Approved', {}));
      goToWalletConnectHome(newLinkedWallet);
    } catch (err) {
      switch (err) {
        case 'user rejection':
          setApproveButtonState(undefined);
          break;
        case 'invalid password':
        case 'password canceled':
        case 'biometric check failed':
          setApproveButtonState('failed');
          await sleep(800);
          setApproveButtonState('loading');
          await sleep(200);
          setApproveButtonState(undefined);
          break;
        default:
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err),
              title: t('Uh oh, something went wrong'),
              action: () => {
                setApproveButtonState(undefined);
              },
            }),
          );
      }
    }
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const showSwitchNetworkWarningMsg = useCallback((): Promise<boolean> => {
    return new Promise(async resolve => {
      dispatch(
        showBottomNotificationModal({
          type: 'question',
          title: t('Allow site to switch network?'),
          message: t('WCSwitchNetworkMsg', {
            chainName: PROTOCOL_NAME[wallet.chain][wallet.network],
          }),
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('Switch Network'),
              action: () => resolve(true),
              primary: true,
            },
            {
              text: t('Cancel'),
              action: () => resolve(false),
            },
          ],
        }),
      );
    });
  }, [dispatch]);

  return (
    <WalletConnectContainer>
      <ScrollView>
        <RequestDetailsContainer>
          {isMethodSupported ? (
            <>
              <HeaderTitle>{t('Summary')}</HeaderTitle>
              <Hr />
              {address ? (
                <>
                  <ItemContainer>
                    <ItemTitleContainer>
                      <H7>{t('Address')}</H7>
                    </ItemTitleContainer>
                    <AddressContainer>
                      {clipboardObj.copied &&
                      clipboardObj.type === 'address' ? (
                        <CopiedSvg width={17} />
                      ) : null}
                      <AddressTextContainer
                        disabled={clipboardObj.copied}
                        onPress={() => {
                          copyToClipboard(address, 'address');
                        }}>
                        <H7 numberOfLines={1} ellipsizeMode={'middle'}>
                          {address}
                        </H7>
                      </AddressTextContainer>
                    </AddressContainer>
                  </ItemContainer>
                  <Hr />
                </>
              ) : null}
              <MessageTitleContainer>
                <ItemTitleContainer>
                  <H7>{t('Message')}</H7>
                </ItemTitleContainer>
                <MessageNoteContainer>
                  {clipboardObj.copied && clipboardObj.type === 'message' ? (
                    <CopiedSvg width={17} />
                  ) : null}
                  <MessageTextContainer
                    disabled={clipboardObj.copied}
                    onPress={() => {
                      copyToClipboard(message, 'message');
                    }}>
                    <H7
                      numberOfLines={3}
                      ellipsizeMode={'tail'}
                      style={{textAlign: 'right'}}>
                      {message}
                    </H7>
                  </MessageTextContainer>
                </MessageNoteContainer>
              </MessageTitleContainer>
            </>
          ) : (
            <Info>
              <InfoHeader>
                <InfoSubTitle>{request.method}</InfoSubTitle>
              </InfoHeader>
              <InfoDescription>{methodNotSupportedMsg}</InfoDescription>
            </Info>
          )}
          <Hr />
          {request?.createdOn ? (
            <>
              <ItemContainer>
                <ItemTitleContainer>
                  <H7>{t('Date')}</H7>
                </ItemTitleContainer>
                <MessageNoteContainer>
                  <H7 numberOfLines={1} ellipsizeMode={'middle'}>
                    {GetAmFormatDate(request?.createdOn)}
                  </H7>
                </MessageNoteContainer>
              </ItemContainer>
              <Hr />
            </>
          ) : null}
        </RequestDetailsContainer>
        <CtaContainer>
          <ActionContainer>
            <Button
              disabled={!isMethodSupported}
              state={approveButtonState}
              buttonStyle={'primary'}
              onPress={approveRequest}>
              {t('Approve')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              state={rejectButtonState}
              buttonStyle={'secondary'}
              onPress={rejectRequest}>
              {t('Reject')}
            </Button>
          </ActionContainer>
        </CtaContainer>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectRequestDetails;
