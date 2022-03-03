import React, {useEffect, useState} from 'react';
import {Platform} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {
  ActionContainer,
  CtaContainer,
  Hr,
} from '../../../components/styled/Containers';
import {H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {
  ItemContainer,
  ItemTitleContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {HeaderTitle} from '../styled/WalletConnectText';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {
  walletConnectApproveCallRequest,
  walletConnectRejectCallRequest,
} from '../../../store/wallet-connect/wallet-connect.effects';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {IWCRequest} from '../../../store/wallet-connect/wallet-connect.models';

export type WalletConnectRequestDetailsParamList = {
  peerId: string;
  requestId: number;
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
  background-color: ${props => (props.theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  height: 37px;
  width: 103px;
  justify-content: flex-start;
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

const WalletConnectRequestDetails = () => {
  const {
    params: {peerId, requestId},
  } = useRoute<RouteProp<{params: WalletConnectRequestDetailsParamList}>>();
  const dispatch = useDispatch();
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const navigation = useNavigation();
  const request: IWCRequest | undefined = useSelector(
    ({WALLET_CONNECT}: RootState) => {
      return WALLET_CONNECT.requests.find(req => req.payload.id === requestId);
    },
  );

  useEffect(() => {
    if (!request) {
      navigation.goBack();
    } else {
      request.payload.method === 'eth_signTypedData' ||
      request.payload.method === 'eth_sign' ||
      request.payload.method === 'eth_signTypedData_v1' ||
      request.payload.method === 'eth_signTypedData_v3' ||
      request.payload.method === 'eth_signTypedData_v4'
        ? setAddress(request.payload.params[0])
        : setAddress(request.payload.params[1]);

      request.payload.method === 'personal_sign'
        ? setMessage(request.payload.params[0])
        : setMessage(request.payload.params[1]);
    }
  }, [request, navigation, setAddress, setMessage]);

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

  return (
    <WalletConnectContainer>
      <ScrollView>
        <RequestDetailsContainer>
          <HeaderTitle>Summary</HeaderTitle>
          <Hr />
          <ItemContainer>
            <ItemTitleContainer>
              <H7>Address</H7>
            </ItemTitleContainer>
            <AddressContainer>
              {clipboardObj.copied && clipboardObj.type === 'address' ? (
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
          <MessageTitleContainer>
            <ItemTitleContainer>
              <H7>Message</H7>
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
                <H7 numberOfLines={3} ellipsizeMode={'tail'}>
                  {message}
                </H7>
              </MessageTextContainer>
            </MessageNoteContainer>
          </MessageTitleContainer>
          <Hr />
        </RequestDetailsContainer>
        <CtaContainer>
          <ActionContainer>
            <Button
              buttonStyle={'primary'}
              disabled={true}
              onPress={() => {
                // TODO: approve req
                // TODO: show success screen
                const response = {
                  id: 0,
                  result: '',
                };
                dispatch(walletConnectApproveCallRequest(peerId, response));
              }}>
              Approve
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              buttonStyle={'secondary'}
              onPress={() => {
                const response = {
                  id: request?.payload.id,
                  error: {message: 'User rejected call request'},
                };
                // TODO: show reject message before go back
                dispatch(walletConnectRejectCallRequest(peerId, response));
              }}>
              Reject
            </Button>
          </ActionContainer>
        </CtaContainer>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectRequestDetails;
