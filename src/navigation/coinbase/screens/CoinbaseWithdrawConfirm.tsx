import React, {useState, useEffect, useCallback} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Wallet} from '../../../store/wallet/wallet.models';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import PaymentSent from '../../wallet/components/PaymentSent';
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
import {CoinbaseGroupParamList} from '../CoinbaseGroup';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {find} from 'lodash';
import {
  coinbaseGetFiatAmount,
  coinbaseSendTransaction,
  coinbaseParseErrorToString,
  coinbaseClearSendTransactionStatus,
} from '../../../store/coinbase';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import prompt from 'react-native-prompt-android';

export interface CoinbaseWithdrawConfirmParamList {
  accountId: string;
  wallet: Wallet;
  amount: number;
}

const CoinbaseWithdrawConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CoinbaseGroupParamList, 'CoinbaseWithdraw'>>();
  const {accountId, wallet, amount} = route.params;
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const [receiveAddress, setReceiveAddress] = useState('');

  const accountData = useAppSelector(({COINBASE}) => {
    return find(COINBASE.accounts[COINBASE_ENV], {id: accountId});
  });
  const exchangeRates = useAppSelector(({COINBASE}) => COINBASE.exchangeRates);

  const sendStatus = useAppSelector(
    ({COINBASE}) => COINBASE.sendTransactionStatus,
  );

  const sendError = useAppSelector(
    ({COINBASE}) => COINBASE.sendTransactionError,
  );

  const apiLoading = useAppSelector(({COINBASE}) => COINBASE.isApiLoading);

  const currency = wallet.currencyAbbreviation;

  const recipientData = {
    recipientName: wallet.credentials.walletName || 'BitPay Wallet',
    recipientAddress: receiveAddress,
    img: wallet.img || wallet.currencyAbbreviation,
  };

  const sendingFrom = {
    walletName: accountData?.name || 'Coinbase Account',
    img: 'coinbase',
  };

  const fiatAmountValue = coinbaseGetFiatAmount(
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
      const buildTx = {
        to: receiveAddress,
        amount: amount,
        currency: currency,
      };
      dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
      await sleep(400);
      dispatch(coinbaseSendTransaction(accountId, buildTx, code));
    },
    [dispatch, accountId, receiveAddress, amount, currency],
  );

  const showError = useCallback(
    (error: CoinbaseErrorsProps | null) => {
      const errMsg = coinbaseParseErrorToString(error);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error sending transaction'),
          message: errMsg,
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(coinbaseClearSendTransactionStatus());
                navigation.goBack();
              },
              primary: true,
            },
          ],
        }),
      );
    },
    [dispatch, navigation, t],
  );

  const askForTwoFactor = useCallback(() => {
    prompt(
      t('Enter 2FA code'),
      t(
        'Two Factor verification code is required for sending this transaction.',
      ),
      [
        {
          text: t('Cancel'),
          onPress: () => {
            showError(sendError);
          },
          style: 'cancel',
        },
        {
          text: t('OK'),
          onPress: code => {
            dispatch(coinbaseClearSendTransactionStatus());
            sendTransaction(code);
          },
        },
      ],
      {
        type: 'secure-text',
        cancelable: true,
        defaultValue: '',
        // @ts-ignore
        keyboardType: 'numeric',
      },
    );
  }, [dispatch, showError, sendError, sendTransaction, t]);

  const generateReceiveAddress = useCallback(
    async (newWallet?: Wallet) => {
      if (newWallet) {
        const address = await dispatch(
          createWalletAddress({wallet: newWallet, newAddress: false}),
        );
        setReceiveAddress(address);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    (async () => {
      if (!apiLoading && sendStatus === 'failed') {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        if (sendError?.errors[0].id === 'two_factor_required') {
          askForTwoFactor();
        } else {
          setResetSwipeButton(true);
          showError(sendError);
        }
      }

      if (!apiLoading && sendStatus === 'success') {
        dispatch(dismissOnGoingProcessModal());
        await sleep(1000);
        setShowPaymentSentModal(true);
      }

      if (wallet && wallet.receiveAddress) {
        setReceiveAddress(wallet.receiveAddress);
      } else {
        generateReceiveAddress(wallet);
      }
    })();
  }, [
    dispatch,
    apiLoading,
    sendStatus,
    sendError,
    showError,
    askForTwoFactor,
    generateReceiveAddress,
    wallet,
  ]);

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={recipientData} hr />
        <SendingFrom sender={sendingFrom} hr />
        <Amount description={t('Total')} amount={total} />
      </DetailsList>

      <SwipeButton
        title={t('Slide to withdraw')}
        forceReset={resetSwipeButton}
        onSwipeComplete={sendTransaction}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          dispatch(coinbaseClearSendTransactionStatus());
          setShowPaymentSentModal(false);
          navigation.goBack();
        }}
      />
    </ConfirmContainer>
  );
};

export default CoinbaseWithdrawConfirm;
