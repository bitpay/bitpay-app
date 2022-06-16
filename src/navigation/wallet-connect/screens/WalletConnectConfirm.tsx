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
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
  startSendPayment,
} from '../../../store/wallet/effects/send/send';
import {sleep} from '../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
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
  SharedDetailRow,
} from '../../wallet/screens/send/confirm/Shared';
import TransactionLevel from '../../wallet/screens/send/TransactionLevel';
import {Alert} from 'react-native';
import {GetFeeOptions} from '../../../store/wallet/effects/fee/fee';
import {useTranslation} from 'react-i18next';

const HeaderRightContainer = styled.View`
  margin-right: 15px;
`;

export interface WalletConnectConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  request: IWCRequest;
  amount: number;
  data: string;
}

const WalletConnectConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<WalletConnectStackParamList, 'WalletConnectConfirm'>>();
  const {
    wallet,
    recipient,
    txDetails,
    txp: _txp,
    request,
    amount,
    data,
  } = route.params;

  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);
  const customizeNonce = useAppSelector(({WALLET}) => WALLET.customizeNonce);

  const [txp, setTxp] = useState(_txp);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [showTransactionLevel, setShowTransactionLevel] = useState(false);

  const {
    fee: _fee,
    sendingTo,
    sendingFrom,
    subTotal,
    gasLimit: _gasLimit,
    gasPrice: _gasPrice,
    nonce: _nonce,
    total: _total,
  } = txDetails;

  const [fee, setFee] = useState(_fee);
  const [total, setTotal] = useState(_total);
  const [gasPrice, setGasPrice] = useState(_gasPrice);
  const [gasLimit, setGasLimit] = useState(_gasLimit);
  const [nonce, setNonce] = useState(_nonce);

  const feeOptions = dispatch(GetFeeOptions(wallet.currencyAbbreviation));

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
              title: t('Uh oh, something went wrong'),
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
        error: {message: t('User rejected call request')},
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
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  }, [dispatch, navigation, request, showErrorMessage, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button onPress={rejectCallRequest} buttonType="pill">
            {t('Reject')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, rejectCallRequest, t]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  const updateTxProposal = async (newOpts: any) => {
    try {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.UPDATING_TXP));
      const {txDetails: _txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails({
          wallet,
          recipient,
          amount,
          gasLimit,
          data,
          ...txp,
          ...newOpts,
        }),
      );

      setTxp(newTxp);
      setFee(_txDetails.fee);
      setTotal(_txDetails.total);
      setGasPrice(_txDetails.gasPrice);
      setGasLimit(_txDetails.gasLimit);
      setNonce(_txDetails.nonce);
      await sleep(500);
      dispatch(dismissOnGoingProcessModal());
    } catch (err: any) {
      dispatch(dismissOnGoingProcessModal());
      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(400),
      ]);
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
  };

  const onCloseTxLevelModal = async (
    newLevel?: any,
    customFeePerKB?: number,
  ) => {
    setShowTransactionLevel(false);
    if (newLevel) {
      updateTxProposal({
        feeLevel: newLevel,
        feePerKb: customFeePerKB,
      });
    }
  };

  const editValue = (title: string, type: string) => {
    Alert.prompt(
      title,
      '',
      [
        {
          text: t('Cancel'),
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: t('OK'),
          onPress: value => {
            const opts: {nonce?: number; feePerKb?: number; feeLevel?: any} =
              {};
            switch (type) {
              case 'nonce':
                opts.nonce = Number(value);
                break;
              case 'gasPrice':
                opts.feePerKb = Number(value) * 1e9;
                opts.feeLevel = 'custom';
                break;
              default:
                break;
            }
            updateTxProposal(opts);
          },
        },
      ],
      'plain-text',
      '',
      'number-pad',
    );
  };

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={sendingTo} hr />
        <Fee
          onPress={() => setShowTransactionLevel(true)}
          fee={fee}
          feeOptions={feeOptions}
          hr
        />
        {gasPrice !== undefined ? (
          <SharedDetailRow
            description={t('Gas price')}
            value={gasPrice.toFixed(2) + ' Gwei'}
            onPress={() => editValue(t('Edit gas price'), 'gasPrice')}
            hr
          />
        ) : null}
        {gasLimit !== undefined ? (
          <SharedDetailRow description={t('Gas limit')} value={gasLimit} hr />
        ) : null}
        {nonce !== undefined && nonce !== null ? (
          <SharedDetailRow
            description={'Nonce'}
            value={nonce}
            onPress={
              customizeNonce
                ? () => editValue(t('Edit nonce'), 'nonce')
                : undefined
            }
            hr
          />
        ) : null}
        <SendingFrom sender={sendingFrom} hr />
        <Amount description={t('SubTotal')} amount={subTotal} />
        <Amount description={t('Total')} amount={total} />
      </DetailsList>
      <SwipeButton
        title={t('Slide to approve')}
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

      <TransactionLevel
        feeLevel={fee.feeLevel}
        wallet={wallet}
        isVisible={showTransactionLevel}
        onCloseModal={(selectedLevel, customFeePerKB) =>
          onCloseTxLevelModal(selectedLevel, customFeePerKB)
        }
        customFeePerKB={fee.feeLevel === 'custom' ? txp?.feePerKb : undefined}
        feePerSatByte={
          fee.feeLevel === 'custom' && txp?.feePerKb
            ? txp?.feePerKb / 1000
            : undefined
        }
      />
    </ConfirmContainer>
  );
};

export default WalletConnectConfirm;
