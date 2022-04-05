import React, {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {RootState} from '../../../store';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Wallet} from '../../../store/wallet/wallet.models';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import PaymentSent from '../../wallet/components/PaymentSent';
import {sleep} from '../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Header,
  SendingFrom,
  SendingTo,
} from '../../wallet/screens/send/confirm/Shared';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {find} from 'lodash';
import {getCoinbaseExchangeRate} from '../../../store/coinbase/coinbase.effects';
import {CoinbaseEffects} from '../../../store/coinbase';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';

export interface CoinbaseWithdrawConfirmParamList {
  accountId: string;
  wallet: Wallet | undefined;
  amount: number;
}

const CoinbaseWithdrawConfirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CoinbaseStackParamList, 'CoinbaseWithdraw'>>();
  const {accountId, wallet, amount} = route.params;
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const accountData = useAppSelector(({COINBASE}: RootState) => {
    return find(COINBASE.accounts[COINBASE_ENV], {id: accountId});
  });
  const exchangeRates = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.exchangeRates,
  );

  const sendStatus = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.sendTransactionStatus,
  );

  const sendError = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.sendTransactionError,
  );

  const apiLoading = useAppSelector(
    ({COINBASE}: RootState) => COINBASE.isApiLoading,
  );

  const currency = wallet?.credentials.coin;
  const toAddress = wallet?.receiveAddress;

  const recipientData = {
    recipientName: wallet?.credentials.walletName || 'BitPay Wallet',
    recipientAddress: toAddress,
    img: wallet?.img || wallet?.credentials.coin,
  };

  const sendingFrom = {
    walletName: accountData?.name || 'Coinbase Account',
    img: 'coinbase',
  };

  const fiatAmountValue = getCoinbaseExchangeRate(
    amount,
    currency.toUpperCase(),
    exchangeRates,
  );

  const total = {
    cryptoAmount: amount + ' ' + currency.toUpperCase(),
    fiatAmount: fiatAmountValue.toFixed(2) + ' USD',
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

  const sendTransaction = useCallback(
    async (code?: string) => {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
      );
      await sleep(400);
      const buildTx = {
        to: toAddress,
        amount: amount,
        currency: currency,
      };
      dispatch(CoinbaseEffects.sendTransaction(accountId, buildTx, code));
      dispatch(dismissOnGoingProcessModal());
    },
    [dispatch, accountId, toAddress, amount, currency],
  );

  const showError = useCallback(
    (error: CoinbaseErrorsProps | null) => {
      const errMsg = CoinbaseEffects.parseErrorToString(error);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: 'Error Sending Transaction',
          message: errMsg,
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {
                dispatch(CoinbaseEffects.clearSendTransactionStatus());
                navigation.goBack();
              },
              primary: true,
            },
          ],
        }),
      );
    },
    [dispatch, navigation],
  );

  const askForTwoFactor = useCallback(() => {
    Alert.prompt(
      'Enter 2FA code',
      'Two Factor verification code is required for sending this transaction.',
      [
        {
          text: 'Cancel',
          onPress: () => {
            showError(sendError);
          },
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: code => {
            dispatch(CoinbaseEffects.clearSendTransactionStatus());
            sendTransaction(code);
          },
        },
      ],
      'secure-text',
      '',
      'number-pad',
    );
  }, [dispatch, showError, sendError, sendTransaction]);

  useEffect(() => {
    if (!apiLoading && sendStatus === 'failed') {
      if (sendError?.errors[0].id === 'two_factor_required') {
        // Ask 2FA
        askForTwoFactor();
      } else {
        // Show error
        showError(sendError);
      }
    }

    if (!apiLoading && sendStatus === 'success') {
      setShowPaymentSentModal(true);
    }
  }, [apiLoading, sendStatus, sendError, showError, askForTwoFactor]);

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={recipientData} hr />
        <SendingFrom sender={sendingFrom} hr />
        <Amount description={'Total'} amount={total} />
      </DetailsList>

      <SwipeButton
        title={'Slide to send'}
        forceReset={resetSwipeButton}
        onSwipeComplete={sendTransaction}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          dispatch(CoinbaseEffects.clearSendTransactionStatus());
          setShowPaymentSentModal(false);
          navigation.goBack();
        }}
      />
    </ConfirmContainer>
  );
};

export default CoinbaseWithdrawConfirm;
