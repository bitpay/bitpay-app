import React, {useState, useEffect, useCallback, useLayoutEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import PaymentSent from '../../../components/PaymentSent';
import {sleep} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
  SharedDetailRow,
} from './Shared';
import {BottomNotificationConfig} from '../../../../../components/modal/bottom-notification/BottomNotification';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../../components/ErrorMessages';
import {BWCErrorMessage} from '../../../../../constants/BWCError';
import TransactionLevel from '../TransactionLevel';
import {HeaderTitle} from '../../../../../components/styled/Text';

export interface ConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  amount: number;
  speedup?: boolean;
}

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Confirm'>>();
  const {
    wallet,
    recipient,
    txDetails,
    txp: _txp,
    amount,
    speedup,
  } = route.params;
  const [txp, setTxp] = useState(_txp);
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const key = allKeys[wallet?.keyId!];
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [showTransactionLevel, setShowTransactionLevel] = useState(false);

  const {
    fee: _fee,
    sendingTo,
    sendingFrom,
    subTotal,
    gasLimit,
    gasPrice: _gasPrice,
    nonce,
    total: _total,
  } = txDetails;

  const [fee, setFee] = useState(_fee);
  const [total, setTotal] = useState(_total);
  const [gasPrice, setGasPrice] = useState(_gasPrice);
  const {currencyAbbreviation} = wallet;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>Confirm {speedup ? 'Speed Up' : 'Payment'}</HeaderTitle>
      ),
    });
  }, [navigation, speedup]);

  const isTxLevelAvailable = () => {
    const excludeCurrencies = ['bch', 'doge', 'ltc', 'xrp'];
    // TODO: exclude paypro, coinbase, usingMerchantFee txs,
    // const {payProUrl} = txDetails;
    return !excludeCurrencies.includes(currencyAbbreviation);
  };

  const onCloseTxLevelModal = async (
    newLevel?: any,
    customFeePerKB?: number,
  ) => {
    setShowTransactionLevel(false);
    try {
      if (newLevel) {
        dispatch(
          startOnGoingProcessModal(OnGoingProcessMessages.CALCULATING_FEE),
        );

        const {txDetails: _txDetails, txp: newTxp} = await dispatch(
          createProposalAndBuildTxDetails({
            wallet,
            recipient,
            amount,
            feeLevel: newLevel,
            feePerKb: customFeePerKB,
          }),
        );

        setTxp(newTxp);
        setFee(_txDetails.fee);
        setTotal(_txDetails.total);
        setGasPrice(_txDetails.gasPrice);
        await sleep(500);
        dispatch(dismissOnGoingProcessModal());
      }
    } catch (err: any) {
      dispatch(dismissOnGoingProcessModal());
      const [errorMessageConfig] = await Promise.all([
        handleCreateTxProposalError(err),
        sleep(400),
      ]);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {},
            },
          ],
        }),
      );
    }
  };

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={sendingTo} hr />
        <Fee
          onPress={
            isTxLevelAvailable()
              ? () => setShowTransactionLevel(true)
              : undefined
          }
          fee={fee}
          currencyAbbreviation={currencyAbbreviation}
          hr
        />
        {gasPrice !== undefined ? (
          <SharedDetailRow
            description={'Gas price'}
            value={gasPrice.toFixed(2) + ' Gwei'}
            hr
          />
        ) : null}
        {gasLimit !== undefined ? (
          <SharedDetailRow description={'Gas limit'} value={gasLimit} hr />
        ) : null}
        {nonce !== undefined && nonce !== null ? (
          <SharedDetailRow description={'Nonce'} value={nonce} hr />
        ) : null}
        <SendingFrom sender={sendingFrom} hr />
        <Amount description={'SubTotal'} amount={subTotal} />
        <Amount description={'Total'} amount={total} />
      </DetailsList>

      <SwipeButton
        title={speedup ? 'Speed Up' : 'Slide to send'}
        forceReset={resetSwipeButton}
        onSwipeComplete={async () => {
          try {
            dispatch(
              startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
            );
            await sleep(400);
            await dispatch(startSendPayment({txp, key, wallet, recipient}));
            dispatch(dismissOnGoingProcessModal());
            await sleep(400);
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
                await sleep(500);
                setResetSwipeButton(true);
            }
          }
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          navigation.navigate('Wallet', {
            screen: 'WalletDetails',
            params: {
              walletId: wallet!.id,
              key,
            },
          });
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
        isSpeedUpTx={speedup}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
