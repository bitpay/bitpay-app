import React, {useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp, StackActions} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import SecureLockIcon from '../../../../../../assets/img/secure-lock.svg';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  buildTxDetails,
  createPayProTxProposal,
  handleCreateTxProposalError,
  removeTxp,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import PaymentSent from '../../../components/PaymentSent';
import {sleep} from '../../../../../utils/helper-methods';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  ConfirmScrollView,
  DetailsList,
  ExchangeRate,
  Fee,
  Header,
  RemainingTime,
  SendingFrom,
  SendingTo,
  WalletSelector,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {PayProOptions} from '../../../../../store/wallet/effects/paypro/paypro';
import {GetFeeOptions} from '../../../../../store/wallet/effects/fee/fee';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import {Invoice} from '../../../../../store/shop/shop.models';
import {startGetRates} from '../../../../../store/wallet/effects';
import {
  CoinbaseAccountProps,
  CoinbaseErrorMessages,
} from '../../../../../api/coinbase/coinbase.types';
import {coinbasePayInvoice} from '../../../../../store/coinbase';
import {useTranslation} from 'react-i18next';
import {Memo} from './Memo';

export interface PayProConfirmParamList {
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
  payProOptions: PayProOptions;
}

const PayProConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'PayProConfirm'>>();
  const {
    payProOptions,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
  } = route.params!;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);

  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [wallet, setWallet] = useState(_wallet);
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const {fee, sendingFrom, subTotal, total} = txDetails || {};
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [disableSwipeSendButton, setDisableSwipeSendButton] = useState(false);
  const payProHost = payProOptions.payProUrl
    .replace('https://', '')
    .split('/')[0];

  const memoizedKeysAndWalletsList = useMemo(
    () =>
      dispatch(
        BuildPayProWalletSelectorList({
          keys,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
          payProOptions,
        }),
      ),
    [defaultAltCurrency.isoCode, dispatch, keys, payProOptions],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectorVisible(true);
  };

  const createTxp = async (selectedWallet: Wallet) => {
    dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
    try {
      const fetchedInvoice = await fetchInvoice(payProOptions.payProUrl);
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl: payProOptions.payProUrl,
          payProOptions,
          invoiceID: payProOptions.paymentId,
          invoice: fetchedInvoice,
        }),
      );
      setWallet(selectedWallet);
      setKey(keys[selectedWallet.keyId]);
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      updateTxDetails(newTxDetails);
      updateTxp(newTxp);
      setInvoice(fetchedInvoice);
      setRecipient({address: newTxDetails.sendingTo.recipientAddress} as {
        address: string;
      });
    } catch (err: any) {
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      const [errorConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(500),
      ]);
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Error'),
            errMsg:
              err.response?.data?.message || err.message || errorConfig.message,
            action: () =>
              wallet ? navigation.goBack() : reshowWalletSelector(),
          }),
        ),
      );
    }
  };

  useEffect(() => {
    wallet ? createTxp(wallet) : setTimeout(() => openKeyWalletSelector(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openKeyWalletSelector = () => {
    setWalletSelectorVisible(true);
  };

  const handleCreateGiftCardInvoiceOrTxpError = async (err: any) => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    const [errorConfig] = await Promise.all([
      dispatch(handleCreateTxProposalError(err)),
      sleep(500),
    ]);
    dispatch(
      AppActions.showBottomNotificationModal(
        CustomErrorMessage({
          title: t('Error'),
          errMsg:
            err.response?.data?.message || err.message || errorConfig.message,
          action: () => reshowWalletSelector(),
        }),
      ),
    );
  };

  const fetchInvoice = async (payProUrl: string) => {
    const invoiceId = payProUrl.split('/').slice(-1)[0];
    const getInvoiceResponse = await axios.get(
      `https://${payProHost}/invoices/${invoiceId}`,
    );
    const {
      data: {data: fetchedInvoice},
    } = getInvoiceResponse as {data: {data: Invoice}};
    return fetchedInvoice;
  };

  const onCoinbaseAccountSelect = async (walletRowProps: WalletRowProps) => {
    dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
    const selectedCoinbaseAccount = walletRowProps.coinbaseAccount!;
    try {
      const fetchedInvoice = await fetchInvoice(payProOptions.payProUrl);
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = dispatch(
        buildTxDetails({
          invoice: fetchedInvoice,
          wallet: walletRowProps,
          rates,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
        }),
      );
      updateTxDetails(newTxDetails);
      updateTxp(undefined);
      setInvoice(fetchedInvoice);
      setCoinbaseAccount(selectedCoinbaseAccount);
      dispatch(dismissOnGoingProcessModal());
    } catch (err) {
      handleCreateGiftCardInvoiceOrTxpError(err);
    }
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    setWalletSelectorVisible(false);
    // not ideal - will dive into why the timeout has to be this long
    await sleep(400);
    createTxp(selectedWallet);
  };

  const sendPayment = async (twoFactorCode?: string) => {
    dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
    txp && wallet && recipient
      ? await dispatch(startSendPayment({txp, key, wallet, recipient}))
      : await dispatch(
          coinbasePayInvoice(
            invoice!.id,
            coinbaseAccount!.currency.code,
            twoFactorCode,
          ),
        );
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setShowPaymentSentModal(true);
  };

  const showError = ({
    error,
    defaultErrorMessage,
    onDismiss,
  }: {
    error?: any;
    defaultErrorMessage: string;
    onDismiss?: () => Promise<void>;
  }) => {
    dispatch(
      AppActions.showBottomNotificationModal(
        CustomErrorMessage({
          title: t('Error'),
          errMsg: error?.message || defaultErrorMessage,
          action: () => onDismiss && onDismiss(),
        }),
      ),
    );
  };

  const request2FA = async () => {
    navigation.navigate('Wallet', {
      screen: WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR,
      params: {
        onSubmit: async twoFactorCode => {
          try {
            await sendPayment(twoFactorCode);
          } catch (error: any) {
            dispatch(dismissOnGoingProcessModal());
            const invalid2faMessage = CoinbaseErrorMessages.twoFactorInvalid;
            error?.message?.includes(invalid2faMessage)
              ? showError({defaultErrorMessage: invalid2faMessage})
              : handlePaymentFailure(error);
            throw error;
          }
        },
      },
    });
    await sleep(400);
    setResetSwipeButton(true);
  };

  const handlePaymentFailure = async (error: any) => {
    dispatch(dismissOnGoingProcessModal());
    if (wallet && txp) {
      await removeTxp(wallet, txp).catch(removeErr =>
        console.error('error deleting txp', removeErr),
      );
    }
    updateTxDetails(undefined);
    updateTxp(undefined);
    setWallet(undefined);
    setInvoice(undefined);
    setCoinbaseAccount(undefined);
    showError({
      error,
      defaultErrorMessage: t('Could not send transaction'),
      onDismiss: () => reshowWalletSelector(),
    });
    await sleep(400);
    setResetSwipeButton(true);
  };

  return (
    <ConfirmContainer>
      <ConfirmScrollView
        extraScrollHeight={50}
        contentContainerStyle={{paddingBottom: 50}}
        keyboardShouldPersistTaps={'handled'}>
        <DetailsList keyboardShouldPersistTaps={'handled'}>
          <Header hr>Summary</Header>
          {invoice ? (
            <RemainingTime
              invoiceExpirationTime={invoice.expirationTime}
              setDisableSwipeSendButton={setDisableSwipeSendButton}
            />
          ) : null}
          <SendingTo
            recipient={{
              recipientName: payProHost,
              img: () => (
                <SecureLockIcon
                  height={18}
                  width={18}
                  style={{marginTop: -2}}
                />
              ),
            }}
            hr
          />
          {wallet || coinbaseAccount ? (
            <>
              <SendingFrom
                sender={sendingFrom!}
                onPress={openKeyWalletSelector}
                hr
              />
              {txDetails?.rateStr ? (
                <ExchangeRate
                  description={t('Exchange Rate')}
                  rateStr={txDetails?.rateStr}
                />
              ) : null}
              {txp ? (
                <Memo
                  memo={txp.message}
                  onChange={message => updateTxp({...txp, message})}
                />
              ) : null}
              <Amount
                description={'SubTotal'}
                amount={subTotal}
                height={83}
                hr
              />
              {wallet && fee ? (
                <Fee
                  fee={fee}
                  hideFeeOptions
                  feeOptions={GetFeeOptions(wallet.chain)}
                  hr
                />
              ) : null}
              <Amount description={'Total'} amount={total} height={83} />
            </>
          ) : null}
        </DetailsList>

        <WalletSelector
          isVisible={walletSelectorVisible}
          setWalletSelectorVisible={setWalletSelectorVisible}
          walletsAndAccounts={memoizedKeysAndWalletsList}
          onWalletSelect={onWalletSelect}
          onCoinbaseAccountSelect={onCoinbaseAccountSelect}
          onBackdropPress={async () => {
            setWalletSelectorVisible(false);
            if (!wallet && !coinbaseAccount) {
              await sleep(100);
              navigation.goBack();
            }
          }}
        />

        <PaymentSent
          isVisible={showPaymentSentModal}
          onCloseModal={async () => {
            navigation.dispatch(StackActions.popToTop());
            if (coinbaseAccount) {
              navigation.dispatch(StackActions.pop(3));
            }
            coinbaseAccount
              ? navigation.navigate('Coinbase', {
                  screen: 'CoinbaseAccount',
                  params: {accountId: coinbaseAccount.id, refresh: true},
                })
              : navigation.navigate('Wallet', {
                  screen: 'WalletDetails',
                  params: {
                    walletId: wallet!.id,
                    key,
                  },
                });
            await sleep(0);
            setShowPaymentSentModal(false);
          }}
        />
      </ConfirmScrollView>
      {wallet || coinbaseAccount ? (
        <>
          <SwipeButton
            disabled={disableSwipeSendButton}
            title={'Slide to send'}
            forceReset={resetSwipeButton}
            onSwipeComplete={async () => {
              try {
                await sendPayment();
                dispatch(
                  logSegmentEvent('track', 'Sent Crypto', {
                    context: 'PayPro Confirm',
                    coin: wallet?.currencyAbbreviation || '',
                  }),
                );
              } catch (err: any) {
                dispatch(dismissOnGoingProcessModal());
                await sleep(400);
                const twoFactorRequired =
                  coinbaseAccount &&
                  err?.message?.includes(
                    CoinbaseErrorMessages.twoFactorRequired,
                  );
                twoFactorRequired
                  ? await request2FA()
                  : await handlePaymentFailure(err);
              }
            }}
          />
        </>
      ) : null}
    </ConfirmContainer>
  );
};

export default PayProConfirm;
