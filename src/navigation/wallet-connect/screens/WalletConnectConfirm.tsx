import React, {useCallback, useLayoutEffect, useState, useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {RouteProp} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {ScrollView, View} from 'react-native';
import {H4, H5, H6, H7} from '../../../components/styled/Text';
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
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import DefaultSvg from '../../../../assets/img/currencies/default.svg';
import {WalletConnectStackParamList} from '../WalletConnectStack';
import SendToPill from '../../wallet/components/SendToPill';
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

const ConfirmContainer = styled.SafeAreaView`
  flex: 1;
  width: 100%;
`;

const Header = styled.View`
  margin-top: 10px;
  height: 80px;
  justify-content: center;
`;

const DetailContainer = styled.View`
  min-height: 80px;
  margin: 5px 0;
  justify-content: center;
`;

const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

const DetailsList = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

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

  const {
    currency,
    fee,
    sendingFrom,
    sendingTo: {recipientName, recipientAddress},
    subTotal,
    total,
  } = txDetails;

  const getIcon = () => {
    return SUPPORTED_CURRENCIES.includes(currency) ? (
      CurrencyListIcons[currency]({width: 18, height: 18})
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  const approveCallRequest = async () => {
    try {
      let password: string | undefined;

      if (key.isPrivKeyEncrypted) {
        password = await new Promise<string>((resolve, reject) => {
          dispatch(
            showDecryptPasswordModal({
              onSubmitHandler: async (_password: string) => {
                if (checkEncryptPassword(key, _password)) {
                  dispatch(dismissDecryptPasswordModal());
                  await sleep(500);
                  resolve(_password);
                } else {
                  dispatch(dismissDecryptPasswordModal());
                  await sleep(500);
                  dispatch(showBottomNotificationModal(WrongPasswordError()));
                  reject('invalid password');
                }
              },
              onCancelHandler: () => {
                reject('password canceled');
              },
            }),
          );
        });
      }
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
      );
      const broadcastedTx = (await dispatch<any>(
        startSendPayment({txp, key, wallet, recipient, password}),
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
      switch (err) {
        case 'invalid password':
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
        <Header>
          <H6>SUMMARY</H6>
        </Header>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H7>Sending to</H7>
            <SendToPill
              icon={getIcon()}
              description={recipientName || recipientAddress || ''}
            />
          </DetailRow>
        </DetailContainer>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H7>Miner fee</H7>
            <DetailColumn>
              <H5>{fee.feeLevel.toUpperCase()}</H5>
              <H6>{fee.cryptoAmount}</H6>
              <H7>
                {fee.fiatAmount} ({fee.percentageOfTotalAmount} of total amount)
              </H7>
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H7>Sending from</H7>
            <H5>{sendingFrom.walletName}</H5>
          </DetailRow>
        </DetailContainer>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H6>SUBTOTAL</H6>
            <DetailColumn>
              <H4>{subTotal.cryptoAmount}</H4>
              <H7>{subTotal.fiatAmount}</H7>
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        <DetailContainer>
          <DetailRow>
            <H6>TOTAL</H6>
            <View>
              <DetailColumn>
                <H4>{total.cryptoAmount}</H4>
                <H7>{total.fiatAmount}</H7>
              </DetailColumn>
            </View>
          </DetailRow>
        </DetailContainer>
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
