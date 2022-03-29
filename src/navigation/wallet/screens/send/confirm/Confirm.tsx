import React, {useState} from 'react';
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
import TransactionSpeed from '../TransactionSpeed';

export interface ConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  amount: number;
}

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Confirm'>>();
  const {wallet, recipient, txDetails, txp: _txp, amount} = route.params;
  const [txp, setTxp] = useState(_txp);
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const key = allKeys[wallet?.keyId!];
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [showTransactionSpeed, setShowTransactionSpeed] = useState(false);

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

  const isTxSpeedAvailable = () => {
    const excludeCurrencies = ['bch', 'doge', 'ltc', 'xrp'];
    // TODO: exclude paypro, coinbase, usingMerchantFee txs,
    // const {payProUrl} = txDetails;
    return !excludeCurrencies.includes(currencyAbbreviation);
  };

  const onCloseTxSpeedModal = async (
    newSpeedLevel?: any,
    customFeePerKB?: number,
  ) => {
    setShowTransactionSpeed(false);
    try {
      if (newSpeedLevel) {
        dispatch(
          startOnGoingProcessModal(OnGoingProcessMessages.CALCULATING_FEE),
        );

        const {txDetails: _txDetails, txp: newTxp} = await dispatch(
          createProposalAndBuildTxDetails({
            wallet,
            recipient,
            amount,
            feeLevel: newSpeedLevel,
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

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={sendingTo} hr />
        <Fee
          onPress={
            isTxSpeedAvailable()
              ? () => setShowTransactionSpeed(true)
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
        {nonce && <SharedDetailRow description={'Nonce'} value={nonce} hr />}
        <SendingFrom sender={sendingFrom} hr />
        <Amount description={'SubTotal'} amount={subTotal} />
        <Amount description={'Total'} amount={total} />
      </DetailsList>

      <SwipeButton
        title={'Slide to send'}
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
          } catch (err) {}
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          navigation.navigate('Wallet', {
            screen: 'WalletDetails',
            params: {
              walletId: wallet!.id,
              key,
            },
          });
          await sleep(300);
          setShowPaymentSentModal(false);
        }}
      />

      <TransactionSpeed
        feeLevel={fee.feeLevel}
        wallet={wallet}
        isVisible={showTransactionSpeed}
        onCloseModal={(selectedLevel, customFeePerKB) =>
          onCloseTxSpeedModal(selectedLevel, customFeePerKB)
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

export default Confirm;
