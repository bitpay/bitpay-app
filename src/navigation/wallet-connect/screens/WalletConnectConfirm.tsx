import React, {useCallback, useLayoutEffect, useState, useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {RouteProp} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../store/wallet/wallet.models';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {startSendPayment} from '../../../store/wallet/effects/send/send';
import {sleep} from '../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissDecryptPasswordModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../store/app/app.actions';
import {WalletConnectStackParamList} from '../WalletConnectStack';
import PaymentSent from '../../wallet/components/PaymentSent';
import {
  walletConnectApproveCallRequest,
  walletConnectRejectCallRequest,
} from '../../../store/wallet-connect/wallet-connect.effects';
import {IWCRequest} from '../../../store/wallet-connect/wallet-connect.models';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {checkEncryptPassword} from '../../../store/wallet/utils/wallet';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
} from '../../wallet/screens/send/confirm/Shared';

const HeaderRightContainer = styled.View`
  margin-right: 15px;
`;

export interface WalletConnectConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  request: IWCRequest;
}

const WalletConnectConfirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<WalletConnectStackParamList, 'WalletConnectConfirm'>>();
  const {
    wallet,
    recipient,
    txDetails: _txDetails,
    txp: _txp,
    request,
  } = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);

  const [txDetails] = useState(_txDetails);
  const [txp] = useState(_txp);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const {fee, sendingFrom, sendingTo, subTotal, total} = txDetails;

  const approveCallRequest = async () => {
    try {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
      );
      const broadcastedTx = (await dispatch<any>(
        startSendPayment({txp, key, wallet, recipient}),
      )) as any;
      const response = {
        id: request.payload.id,
        result: broadcastedTx.txid,
      };
      await dispatch(walletConnectApproveCallRequest(request.peerId, response));
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      setShowPaymentSentModal(true);
    } catch (err) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        case 'password canceled':
          setResetSwipeButton(true);
          break;
        default:
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err),
              title: 'Uh oh, something went wrong',
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

  const rejectCallRequest = useCallback(async () => {
    haptic('impactLight');
    try {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.REJECTING_CALL_REQUEST),
      );
      const response = {
        id: request?.payload.id,
        error: {message: 'User rejected call request'},
      };
      (await dispatch<any>(
        walletConnectRejectCallRequest(request.peerId, response),
      )) as any;
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      navigation.goBack();
    } catch (err) {
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: 'Uh oh, something went wrong',
        }),
      );
    }
  }, [dispatch, navigation, request, showErrorMessage]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button onPress={rejectCallRequest} buttonType="pill">
            Reject
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, rejectCallRequest]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={sendingTo} hr />
        <Fee fee={fee} hr />
        <SendingFrom sender={sendingFrom} hr />
        <Amount description={'SubTotal'} amount={subTotal} />
        <Amount description={'Total'} amount={total} />
      </DetailsList>
      <SwipeButton
        title={'Slide to send'}
        onSwipeComplete={approveCallRequest}
        forceReset={resetSwipeButton}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          navigation.goBack();
        }}
      />
    </ConfirmContainer>
  );
};

export default WalletConnectConfirm;
