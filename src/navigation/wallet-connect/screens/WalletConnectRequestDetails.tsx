import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../components/button/Button';
import {
  ActionContainer,
  CtaContainer,
  Hr,
  Info,
} from '../../../components/styled/Containers';
import {
  BaseText,
  H7,
  InfoDescription,
  InfoHeader,
  InfoTitle,
} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {
  IconContainer,
  ItemContainer,
  ItemTitleContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {HeaderTitle} from '../styled/WalletConnectText';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useAppDispatch} from '../../../utils/hooks';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
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
import {getMessageView, getRequestSummary} from './walletConnectRequestSummary';
import {View} from 'react-native';
import Blockie from '../../../components/blockie/Blockie';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

export type WalletConnectRequestDetailsParamList = {
  request: any;
  wallet: Wallet;
  peerName?: string;
  topic?: string;
};

const RequestDetailsContainer = styled.View``;

const AddressContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 0;
`;

const AddressTextContainer = styled(TouchableOpacity)`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  width: 150px;
  margin-left: 2px;
  justify-content: center;
  flex-direction: row;
  align-items: center;
  padding: 10px 20px;
`;

const MessageTitleContainer = styled.View`
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0;
`;

const MessageNoteContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const MessageTextContainer = styled(TouchableOpacity)`
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
    params: {request: _request, wallet, peerName, topic},
  } = useRoute<RouteProp<{params: WalletConnectRequestDetailsParamList}>>();
  const dispatch = useAppDispatch();
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState<any>('');
  const [isMethodSupported, setIsMethodSupported] = useState<boolean>();
  const [methodNotSupportedMsg, setMethodNotSupportedMsg] = useState<string>();
  const [approveButtonState, setApproveButtonState] = useState<ButtonState>();
  const [rejectButtonState, setRejectButtonState] = useState<ButtonState>();
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const navigation = useNavigation();
  const request = _request.params.request;

  useEffect(() => {
    if (!request) {
      return;
    }
    const summary = getRequestSummary(_request);

    setAddress(summary.address || '');
    setIsMethodSupported(summary.isMethodSupported);

    if (summary.kind === 'switchChain') {
      setMessage(t('WCSwitchEthereumChainMsg', {peerName}));
      if (!summary.isMethodSupported) {
        setMethodNotSupportedMsg(t('WCNotSupportedChainMsg', {peerName}));
      }
      return;
    }

    if (summary.kind === 'unsupportedMethod') {
      setMethodNotSupportedMsg(
        t('Sorry, we currently do not support this method.'),
      );
      return;
    }

    setMessage(summary.message);
  }, [
    _request,
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

  const rejectRequest = async () => {
    try {
      setRejectButtonState('loading');
      await dispatch(walletConnectV2RejectCallRequest(_request));
      setRejectButtonState('success');
      dispatch(Analytics.track('WalletConnect Request Rejected', {}));
      navigation.goBack();
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
      setApproveButtonState('loading');
      await dispatch(walletConnectV2ApproveCallRequest(_request, wallet));
      setApproveButtonState('success');
      dispatch(Analytics.track('WalletConnect Request Approved', {}));
      navigation.goBack();
    } catch (err) {
      switch (err) {
        case 'user rejection':
          setApproveButtonState(undefined);
          break;
        case 'invalid password':
        case 'password canceled':
        case 'biometric check failed':
        case 'user denied transaction':
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

  const parseAndDisplayMessage = (messageObj: any) => {
    const renderObject = (obj: any, indent = 0) => {
      return Object.keys(obj).map(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          return (
            <View key={key} style={{paddingLeft: indent * 10}}>
              <BaseText style={{paddingVertical: 5}}>
                <BaseText style={{fontWeight: 'bold'}}>{key}:</BaseText>
              </BaseText>
              {renderObject(value, indent + 1)}
            </View>
          );
        } else {
          return (
            <BaseText
              key={key}
              style={{paddingLeft: indent * 10, paddingVertical: 5}}>
              <BaseText style={{fontWeight: 'bold'}}>{key}:</BaseText>{' '}
              {String(value)}
            </BaseText>
          );
        }
      });
    };

    return <View>{renderObject(messageObj)}</View>;
  };

  const renderMessage = (message: any) => {
    const view = getMessageView(message);

    if (view.kind === 'typedData') {
      return parseAndDisplayMessage(view.value);
    }

    if (view.kind === 'raw') {
      return (
        <TouchableOpacity
          disabled={clipboardObj.copied}
          onPress={() => {
            copyToClipboard(view.value, 'message');
          }}>
          <BaseText style={{paddingVertical: 5}}>{view.value}</BaseText>
        </TouchableOpacity>
      );
    }

    return view.value;
  };

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
                        <IconContainer>
                          <Blockie size={19} seed={address} />
                        </IconContainer>
                        <H7
                          numberOfLines={1}
                          ellipsizeMode={'middle'}
                          style={{marginLeft: 10}}>
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
                  <View style={{paddingLeft: 10}}>
                    {clipboardObj.copied && clipboardObj.type === 'message' ? (
                      <CopiedSvg width={17} />
                    ) : null}
                  </View>
                </ItemTitleContainer>
                {renderMessage(message)}
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
