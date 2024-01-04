import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {HeaderRightContainer} from '../../../../../components/styled/Containers';
import {RouteProp, StackActions} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Wallet} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  buildTxDetails,
  createPayProTxProposal,
  handleCreateTxProposalError,
  removeTxp,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {sleep, formatFiatAmount} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {ShopActions, ShopEffects} from '../../../../../store/shop';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Header,
  SendingFrom,
  SendingTo,
  WalletSelector,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../../constants/config';
import {BillPayAccount, Invoice} from '../../../../../store/shop/shop.models';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import {
  CoinbaseAccountProps,
  CoinbaseErrorMessages,
} from '../../../../../api/coinbase/coinbase.types';
import {startGetRates} from '../../../../../store/wallet/effects';
import {coinbasePayInvoice} from '../../../../../store/coinbase';
import {useTranslation} from 'react-i18next';
import {getTransactionCurrencyForPayInvoice} from '../../../../../store/coinbase/coinbase.effects';
import {
  BillScreens,
  BillGroupParamList,
} from '../../../../tabs/shop/bill/BillGroup';
import {Image, View} from 'react-native';
import Button from '../../../../../components/button/Button';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import haptic from '../../../../../components/haptic-feedback/haptic';
import BillAlert from '../../../../tabs/shop/bill/components/BillAlert';
import PaymentSent from '../../../components/PaymentSent';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../../../../tabs/shop/bill/utils';
import {getCurrencyCodeFromCoinAndChain} from '../../../../bitpay-id/utils/bitpay-id-utils';
import {WalletScreens} from '../../../../../navigation/wallet/WalletGroup';

export interface BillPaymentRequest {
  amount: number;
  amountType?: string;
  billPayAccount: BillPayAccount;
}

export interface BillConfirmParamList {
  billPayments: BillPaymentRequest[];
}

const BillConfirm: React.VFC<
  NativeStackScreenProps<BillGroupParamList, BillScreens.BILL_CONFIRM>
> = ({navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigator = useNavigation();
  const route =
    useRoute<RouteProp<BillGroupParamList, BillScreens.BILL_CONFIRM>>();
  const {
    billPayments,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
  } = route.params!;

  const amount = billPayments.reduce(
    (sum, billPayment) => sum + billPayment.amount,
    0,
  );
  const billPayAccount = billPayments[0].billPayAccount;

  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [convenienceFee, setConvenienceFee] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const {fee, networkCost, sendingFrom, total} = txDetails || {};
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const baseEventParams = {
    ...(billPayments.length === 1
      ? getBillAccountEventParams(billPayAccount)
      : []),
    amount,
    amountType:
      billPayments.length === 1 ? billPayments[0].billPayAccount : 'multiple',
    numAccounts: billPayments.length,
    ...((wallet || coinbaseAccount) && {
      coin: wallet ? wallet.currencyAbbreviation : coinbaseAccount?.currency,
      walletType: wallet ? 'BitPay Wallet' : 'Coinbase Account',
    }),
  };

  const memoizedKeysAndWalletsList = useMemo(
    () =>
      dispatch(
        BuildPayProWalletSelectorList({
          keys,
          network: APP_NETWORK,
          invoice,
          skipThreshold: true,
        }),
      ),
    [dispatch, invoice, keys],
  );

  useEffect(() => {
    return () => {
      dispatch(ShopActions.deletedUnsoldGiftCards());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            accessibilityLabel="cancel-button"
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');
              navigation.popToTop();
              navigation.pop();
            }}>
            {t('Cancel')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  useFocusEffect(() => {
    dispatch(
      Analytics.track('Bill Pay — Viewed Confirm Page', baseEventParams),
    );
  });

  const openWalletSelector = async (delay?: number) => {
    if (delay) {
      await sleep(delay);
    }
    setWalletSelectorVisible(true);
    dispatch(
      Analytics.track('Bill Pay - Viewed Wallet Selector', baseEventParams),
    );
  };

  const createBillPayInvoice = async ({
    transactionCurrency,
  }: {
    clientId: string;
    transactionCurrency: string;
  }) => {
    dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
    const invoiceCreationParams = {
      transactionCurrency,
      payments: billPayments.map(payment => ({
        amount: payment.amount,
        currency: 'USD',
        accountId: payment.billPayAccount.id,
      })),
    };
    return dispatch(
      ShopEffects.startCreateBillPayInvoice(invoiceCreationParams),
    );
  };

  const handleBillPayInvoiceOrTxpError = async (err: any) => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    const [errorConfig] = await Promise.all([
      dispatch(handleCreateTxProposalError(err)),
      sleep(500),
    ]);
    showError({
      defaultErrorMessage:
        err.response?.data?.message || err.message || errorConfig.message,
      onDismiss: () => openWalletSelector(400),
    });
  };

  const onCoinbaseAccountSelect = async (walletRowProps: WalletRowProps) => {
    const selectedCoinbaseAccount = walletRowProps.coinbaseAccount!;
    const transactionCurrency = dispatch(
      getTransactionCurrencyForPayInvoice(
        selectedCoinbaseAccount.currency.code,
      ),
    );
    try {
      const {invoice: newInvoice, payments} = await createBillPayInvoice({
        clientId: selectedCoinbaseAccount.id,
        transactionCurrency,
      });
      const {totalBillAmount, serviceFee} = payments.reduce(
        (totals, payment) => {
          return {
            totalBillAmount: totals.totalBillAmount + payment.amount,
            serviceFee: totals.serviceFee + payment.convenienceFee,
          };
        },
        {totalBillAmount: 0, serviceFee: 0},
      );
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = await dispatch(
        buildTxDetails({
          invoice: newInvoice,
          wallet: walletRowProps,
          rates,
          defaultAltCurrencyIsoCode: 'USD',
        }),
      );
      updateTxDetails(newTxDetails);
      setInvoice(newInvoice);
      setCoinbaseAccount(selectedCoinbaseAccount);
      setConvenienceFee(serviceFee);
      setSubtotal(totalBillAmount);
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      dispatch(Analytics.track('Bill Pay — Selected Wallet', baseEventParams));
    } catch (err) {
      handleBillPayInvoiceOrTxpError(err);
    }
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    try {
      const {
        invoice: newInvoice,
        invoiceId,
        payments,
      } = await createBillPayInvoice({
        clientId: selectedWallet.id,
        transactionCurrency: getCurrencyCodeFromCoinAndChain(
          selectedWallet.currencyAbbreviation.toUpperCase(),
          selectedWallet.chain,
        ),
      });
      const {totalBillAmount, serviceFee} = payments.reduce(
        (totals, payment) => {
          return {
            totalBillAmount: totals.totalBillAmount + payment.amount,
            serviceFee: totals.serviceFee + payment.convenienceFee,
          };
        },
        {totalBillAmount: 0, serviceFee: 0},
      );
      const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
      const paymentUrl = `${baseUrl}/i/${invoiceId}`;
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl,
          invoice: newInvoice,
          invoiceID: invoiceId,
          message: billPayments
            .reduce(
              (message, {billPayAccount: account, amount: paymentAmount}) =>
                `${message}${formatFiatAmount(paymentAmount, 'USD')} to ${
                  account[account.type].merchantName
                } ****${account[account.type].mask}\n`,
              '',
            )
            .trim(),
          customData: {
            billPayMerchantIds: billPayments.map(
              ({billPayAccount: account}) => account[account.type].merchantId,
            ),
            service: 'billpay',
          },
        }),
      );
      setWallet(selectedWallet);
      setKey(keys[selectedWallet.keyId]);
      updateTxDetails(newTxDetails);
      updateTxp(newTxp);
      setRecipient({address: newTxDetails.sendingTo.recipientAddress} as {
        address: string;
      });
      setConvenienceFee(serviceFee);
      setSubtotal(totalBillAmount);
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      dispatch(Analytics.track('Bill Pay — Selected Wallet', baseEventParams));
    } catch (err: any) {
      handleBillPayInvoiceOrTxpError(err);
    }
  };

  const sendPayment = async (twoFactorCode?: string) => {
    dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
    return txp && wallet && recipient
      ? await dispatch(startSendPayment({txp, key, wallet, recipient}))
      : await dispatch(
          coinbasePayInvoice(
            invoice!.id,
            coinbaseAccount!.currency.code,
            twoFactorCode,
          ),
        );
  };

  const handlePaymentSuccess = async () => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setShowPaymentSentModal(true);
    dispatch(ShopEffects.startFindBillPayments()).catch(_ => {});
    dispatch(
      Analytics.track('Bill Pay — Successful Bill Paid', baseEventParams),
    );
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

  const handlePaymentFailure = async (error: any) => {
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
      onDismiss: () => openWalletSelector(400),
    });
    await sleep(400);
    setResetSwipeButton(true);
    dispatch(Analytics.track('Bill Pay — Failed Bill Paid', baseEventParams));
  };

  const request2FA = async () => {
    navigation.navigate(WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR, {
      onSubmit: async twoFactorCode => {
        try {
          await sendPayment(twoFactorCode);
          navigation.dispatch(StackActions.pop());
          await handlePaymentSuccess();
        } catch (error: any) {
          dispatch(dismissOnGoingProcessModal());
          const invalid2faMessage = CoinbaseErrorMessages.twoFactorInvalid;
          error?.message?.includes(CoinbaseErrorMessages.twoFactorInvalid)
            ? showError({defaultErrorMessage: invalid2faMessage})
            : handlePaymentFailure(error);
          throw error;
        }
      },
    });
    await sleep(400);
    setResetSwipeButton(true);
  };

  useEffect(() => {
    openWalletSelector(100);
  }, []);

  return (
    <ConfirmContainer>
      <DetailsList>
        <>
          <Header hr>Summary</Header>
          <SendingTo
            recipient={{
              recipientName:
                billPayments.length === 1
                  ? `${billPayAccount[billPayAccount.type].merchantName.slice(
                      0,
                      12,
                    )} ****${billPayAccount[billPayAccount.type].mask}`
                  : '',
              img: () => (
                <View style={{flexDirection: 'row'}}>
                  {billPayments.map(({billPayAccount}, index) => (
                    <Image
                      key={index}
                      style={{
                        height: 18,
                        width: 18,
                        marginTop: -2,
                        borderRadius: 10,
                        marginRight: 2,
                        ...(billPayments.length > 1 && {
                          marginRight:
                            index === billPayments.length - 1 ? -5 : -3,
                          zIndex: billPayments.length - index,
                        }),
                      }}
                      source={{
                        uri: billPayAccount[billPayAccount.type].merchantIcon,
                      }}
                    />
                  ))}
                </View>
              ),
            }}
            hr
          />
        </>
        {wallet || coinbaseAccount ? (
          <>
            <SendingFrom
              sender={sendingFrom!}
              onPress={openWalletSelector}
              hr
            />
            <Amount
              description={t('Subtotal')}
              amount={{
                fiatAmount: `${formatFiatAmount(subtotal, 'USD')}`,
                cryptoAmount: '',
              }}
              fiatOnly
              hr
            />
            <Amount
              description={t('Network Cost')}
              amount={networkCost}
              fiatOnly
              hr
            />
            {fee && fee.fiatAmount !== '$0.00' ? (
              <Amount description={t('Miner fee')} amount={fee} fiatOnly hr />
            ) : null}
            <Amount
              description={'Convenience fee'}
              amount={{
                fiatAmount: convenienceFee
                  ? formatFiatAmount(convenienceFee, 'USD')
                  : t('Waived'),
                cryptoAmount: '',
              }}
              fiatOnly
              hr
            />
            <Amount description={t('Total')} amount={total} />
            <BillAlert />
          </>
        ) : null}
      </DetailsList>
      {wallet || coinbaseAccount ? (
        <>
          <SwipeButton
            title={t('Slide to send')}
            forceReset={resetSwipeButton}
            onSwipeComplete={async () => {
              dispatch(
                Analytics.track(
                  'Bill Pay — Clicked Slide to Confirm',
                  baseEventParams,
                ),
              );
              try {
                await sendPayment();
                await handlePaymentSuccess();
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
          navigation.dispatch(StackActions.pop());
          navigator.navigate(BillScreens.PAYMENTS, {});
          await sleep(0);
          setShowPaymentSentModal(false);
        }}
      />
    </ConfirmContainer>
  );
};

export default BillConfirm;
