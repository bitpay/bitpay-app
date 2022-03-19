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
import {startSendPayment} from '../../../../../store/wallet/effects/send/send';
import PaymentSent from '../../../components/PaymentSent';
import {sleep} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
} from './Shared';
import TransactionSpeed from '../TransactionSpeed';

export interface ConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
}

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Confirm'>>();
  const {wallet, recipient, txDetails, txp} = route.params;
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const key = allKeys[wallet?.keyId!];
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [showTransactionSpeed, setShowTransactionSpeed] = useState(false);

  const {fee, sendingTo, sendingFrom, subTotal, total} = txDetails;

  console.log(txDetails);
  const isTxSpeedAvailable = () => {
      const {currencyAbbreviation} = wallet;
      const excludeCurrencies = ['bch', 'doge', 'ltc', 'xrp'];
      // TODO: exclude paypro, coinbase, usingMerchantFee txs,
      // const {payProUrl} = txDetails;
      return (!excludeCurrencies.includes(currencyAbbreviation));
  }

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={sendingTo} hr />
        <Fee onPress={isTxSpeedAvailable() ? () => setShowTransactionSpeed(true) : undefined} fee={fee} hr />
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
        onCloseModal={selectedLevel => {
          setShowTransactionSpeed(false);
        }}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
