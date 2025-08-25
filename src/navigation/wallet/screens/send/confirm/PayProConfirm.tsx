import Transport from '@ledgerhq/hw-transport';
import {RouteProp, StackActions} from '@react-navigation/core';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {WalletScreens, WalletGroupParamList} from '../../../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import SecureLockIcon from '../../../../../../assets/img/secure-lock.svg';
import {
  Key,
  Recipient,
  TransactionProposal,
  TxDetails,
  TxDetailsFee,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  buildTxDetails,
  createPayProTxProposal,
  handleCreateTxProposalError,
  handleSendError,
  removeTxp,
  showConfirmAmountInfoSheet,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {sleep, toggleThenUntoggle} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  GetFeeUnits,
  IsERCToken,
  IsVMChain,
} from '../../../../../store/wallet/utils/currency';
import {
  InfoDescription,
  InfoHeader,
  InfoTitle,
} from '../../../../../components/styled/Text';
import {
  Info,
  InfoImageContainer,
  InfoTriangle,
} from '../../../../../components/styled/Containers';
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
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {PayProOptions} from '../../../../../store/wallet/effects/paypro/paypro';
import {
  GetFeeOptions,
  getFeeRatePerKb,
} from '../../../../../store/wallet/effects/fee/fee';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import {Invoice} from '../../../../../store/shop/shop.models';
import {startGetRates} from '../../../../../store/wallet/effects';
import {
  CoinbaseAccountProps,
  CoinbaseErrorMessages,
} from '../../../../../api/coinbase/coinbase.types';
import {coinbasePayInvoice} from '../../../../../store/coinbase';
import {TxDescription} from './TxDescription';
import {HIGH_FEE_LIMIT} from '../../../../../constants/wallet';
import WarningSvg from '../../../../../../assets/img/warning.svg';
import {
  ConfirmHardwareWalletModal,
  SimpleConfirmPaymentState,
} from '../../../../../components/modal/confirm-hardware-wallet/ConfirmHardwareWalletModal';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
import {currencyConfigs} from '../../../../../components/modal/import-ledger-wallet/import-account/SelectLedgerCurrency';
import {
  getLedgerErrorMessage,
  prepareLedgerApp,
} from '../../../../../components/modal/import-ledger-wallet/utils';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import TransportHID from '@ledgerhq/react-native-hid';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../../constants/config';
import {RootStacks} from '../../../../../Root';
import {TabsScreens} from '../../../../tabs/TabsStack';
import {CommonActions} from '@react-navigation/native';

export interface PayProConfirmParamList {
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
  payProOptions: PayProOptions;
  invoice: Invoice;
}

const PayProConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'PayProConfirm'>>();
  const {
    payProOptions,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
    invoice,
  } = route.params!;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);

  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [wallet, setWallet] = useState(_wallet);
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const {fee, sendingFrom, subTotal, total} = txDetails || {};
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [disableSwipeSendButton, setDisableSwipeSendButton] = useState(false);
  const [showHighFeeWarningMessage, setShowHighFeeWarningMessage] =
    useState(false);
  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);

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
          invoice,
          skipThreshold: true,
        }),
      ),
    [defaultAltCurrency.isoCode, dispatch, keys, payProOptions, invoice],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectorVisible(true);
  };

  // use the ref when doing any work that could cause disconnects and cause a new transport to be passed in mid-function
  const transportRef = useRef(hardwareWalletTransport);
  transportRef.current = hardwareWalletTransport;

  const setPromptOpenAppState = (state: boolean) =>
    state && setConfirmHardwareState('selecting');

  // We need a constant fn (no deps) that persists across renders that we can attach to AND detach from transports
  const onDisconnect = useCallback(async () => {
    let retryAttempts = 2;
    let newTp: Transport | null = null;

    // avoid closure values
    const isBle = transportRef.current instanceof TransportBLE;
    const isHid = transportRef.current instanceof TransportHID;
    const shouldReconnect =
      isConfirmHardwareWalletModalVisible && (isBle || isHid);

    if (!shouldReconnect) {
      setHardwareWalletTransport(null);
      return;
    }

    // try to reconnect a few times
    while (!newTp && retryAttempts > 0) {
      if (isBle) {
        newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      } else if (isHid) {
        newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      }

      retryAttempts--;
    }

    if (newTp) {
      newTp.on('disconnect', onDisconnect);
    }
    setHardwareWalletTransport(newTp);
  }, []);

  const createTxp = async (selectedWallet: Wallet) => {
    dispatch(startOnGoingProcessModal('CREATING_TXP'));
    try {
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl: payProOptions.payProUrl,
          payProOptions,
          invoiceID: payProOptions.paymentId,
          invoice,
        }),
      );
      setWallet(selectedWallet);
      setKey(keys[selectedWallet.keyId]);
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      updateTxDetails(newTxDetails);
      updateTxp(newTxp);
      setRecipient({address: newTxDetails.sendingTo.recipientAddress} as {
        address: string;
      });
      if (fee) {
        checkHighFees(selectedWallet, newTxp, fee);
      }
      dispatch(
        Analytics.track('BitPay App - Start Merchant Purchase', {
          merchantBrand: invoice.merchantName,
        }),
      );
    } catch (err: any) {
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      const onDismiss = () =>
        wallet ? navigation.goBack() : reshowWalletSelector();
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err, onDismiss),
      );
      dispatch(
        AppActions.showBottomNotificationModal({
          ...errorMessageConfig,
          message:
            err.response?.data?.message ||
            err.message ||
            errorMessageConfig.message,
        }),
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      wallet
        ? createTxp(wallet)
        : setTimeout(() => openKeyWalletSelector(), 500);
    }, []),
  );

  const openKeyWalletSelector = () => {
    setWalletSelectorVisible(true);
  };

  const handleTxpError = async (err: any) => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    const onDismiss = () => reshowWalletSelector();
    const errorMessageConfig = await dispatch(
      handleCreateTxProposalError(err, onDismiss),
    );
    dispatch(
      AppActions.showBottomNotificationModal({
        ...errorMessageConfig,
        message:
          err.response?.data?.message ||
          err.message ||
          errorMessageConfig.message,
      }),
    );
  };

  const onCoinbaseAccountSelect = async (walletRowProps: WalletRowProps) => {
    dispatch(startOnGoingProcessModal('CREATING_TXP'));
    const selectedCoinbaseAccount = walletRowProps.coinbaseAccount!;
    try {
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = await dispatch(
        buildTxDetails({
          invoice,
          wallet: walletRowProps,
          rates,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
        }),
      );
      updateTxDetails(newTxDetails);
      updateTxp(undefined);
      setCoinbaseAccount(selectedCoinbaseAccount);
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      dispatch(
        Analytics.track('BitPay App - Start Merchant Purchase', {
          merchantBrand: invoice.merchantName,
        }),
      );
    } catch (err) {
      handleTxpError(err);
    }
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    setWalletSelectorVisible(false);
    // not ideal - will dive into why the timeout has to be this long
    await sleep(400);
    createTxp(selectedWallet);
  };
  const startSendingPayment = async ({
    twoFactorCode,
    transport,
  }: {
    twoFactorCode?: string;
    transport?: Transport;
  }) => {
    const isUsingHardwareWallet = !!transport;
    try {
      if (isUsingHardwareWallet) {
        if (txp && wallet && recipient) {
          const {chain, network} = wallet.credentials;
          const configFn = currencyConfigs[chain];
          if (!configFn) {
            throw new Error(`Unsupported currency: ${chain.toUpperCase()}`);
          }
          const params = configFn(network);
          await prepareLedgerApp(
            params.appName,
            transportRef,
            setHardwareWalletTransport,
            onDisconnect,
            setPromptOpenAppState,
          );
          setConfirmHardwareState('sending');
          await sleep(500);
          await dispatch(
            startSendPayment({txp, key, wallet, recipient, transport}),
          );
          setConfirmHardwareState('complete');
          await sleep(1000);
          setConfirmHardwareWalletVisible(false);
        }
      } else {
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
      }
      dispatch(
        Analytics.track('Sent Crypto', {
          context: 'PayPro Confirm',
          coin: wallet?.currencyAbbreviation || '',
        }),
      );
      dispatch(
        Analytics.track('BitPay App - Purchased Merchant', {
          merchantBrand: invoice?.merchantName,
          merchantAmount: invoice?.price,
          merchantCurrency: invoice?.currency,
          coin: wallet?.currencyAbbreviation || '',
        }),
      );

      dispatch(
        AppActions.showPaymentSentModal({
          isVisible: true,
          onCloseModal,
          title:
            wallet?.credentials.n > 1
              ? t('Proposal created')
              : t('Payment Sent'),
        }),
      );

      await sleep(1000);

      if (coinbaseAccount) {
        navigation.dispatch(StackActions.popToTop());
        navigation.dispatch(StackActions.pop(3));
        navigation.navigate('CoinbaseAccount', {
          accountId: coinbaseAccount.id,
          refresh: true,
        });
      } else {
        if (IsVMChain(wallet!.chain) && wallet!.receiveAddress) {
          navigation.dispatch(
            CommonActions.reset({
              index: 2,
              routes: [
                {
                  name: RootStacks.TABS,
                  params: {screen: TabsScreens.HOME},
                },
                {
                  name: WalletScreens.ACCOUNT_DETAILS,
                  params: {
                    keyId: wallet!.keyId,
                    selectedAccountAddress: wallet!.receiveAddress,
                  },
                },
                {
                  name: WalletScreens.WALLET_DETAILS,
                  params: {
                    walletId: wallet!.id,
                    key,
                  },
                },
              ],
            }),
          );
        } else {
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                {
                  name: RootStacks.TABS,
                  params: {screen: TabsScreens.HOME},
                },
                {
                  name: WalletScreens.WALLET_DETAILS,
                  params: {
                    walletId: wallet!.id,
                    key,
                  },
                },
              ],
            }),
          );
        }
      }
    } catch (err: any) {
      if (isUsingHardwareWallet) {
        setConfirmHardwareWalletVisible(false);
        setConfirmHardwareState(null);
        err = getLedgerErrorMessage(err);
      }
      dispatch(dismissOnGoingProcessModal());
      const twoFactorRequired =
        coinbaseAccount &&
        err?.message?.includes(CoinbaseErrorMessages.twoFactorRequired);
      twoFactorRequired ? await request2FA() : await handlePaymentFailure(err);
    }
  };

  const showErrorMessage = useCallback(
    async ({
      error,
      defaultErrorMessage,
      onDismiss,
    }: {
      error?: any;
      defaultErrorMessage: string;
      onDismiss?: () => Promise<void>;
    }) => {
      await sleep(500);
      dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Error'),
            errMsg: error?.message || defaultErrorMessage,
            action: () => onDismiss && onDismiss(),
          }),
        ),
      );
    },
    [dispatch],
  );

  const request2FA = async () => {
    navigation.navigate(WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR, {
      onSubmit: async twoFactorCode => {
        try {
          await startSendingPayment({twoFactorCode});
        } catch (error: any) {
          dispatch(dismissOnGoingProcessModal());
          const invalid2faMessage = CoinbaseErrorMessages.twoFactorInvalid;
          error?.message?.includes(invalid2faMessage)
            ? showErrorMessage({defaultErrorMessage: invalid2faMessage})
            : handlePaymentFailure(error);
          throw error;
        }
      },
    });
    toggleThenUntoggle(setResetSwipeButton);
  };

  const handlePaymentFailure = async (error: any) => {
    const handled = dispatch(
      handleSendError({error, onDismiss: () => reshowWalletSelector()}),
    );
    if (!handled) {
      if (wallet && txp) {
        await removeTxp(wallet, txp).catch(removeErr =>
          console.error('error deleting txp', removeErr),
        );
      }
      updateTxDetails(undefined);
      updateTxp(undefined);
      setWallet(undefined);
      setCoinbaseAccount(undefined);
    }
    toggleThenUntoggle(setResetSwipeButton);
    dispatch(
      Analytics.track('BitPay App - Failed Merchant Purchase', {
        merchantBrand: invoice?.merchantName,
        merchantAmount: invoice?.price,
        merchantCurrency: invoice?.currency,
        coin: wallet?.currencyAbbreviation || '',
      }),
    );
  };

  const checkHighFees = async (wallet: Wallet, txp: any, fee: TxDetailsFee) => {
    const {feeUnitAmount} = GetFeeUnits(wallet.chain);
    let feePerKb: number;
    if (txp.feePerKb) {
      feePerKb = txp.feePerKb;
    } else {
      feePerKb = await getFeeRatePerKb({wallet, feeLevel: fee.feeLevel});
    }
    setShowHighFeeWarningMessage(
      feePerKb / feeUnitAmount >= HIGH_FEE_LIMIT[wallet.chain] &&
        txp.amount !== 0,
    );
  };

  // on hardware wallet disconnect, just clear the cached transport object
  // errors will be thrown and caught as needed in their respective workflows
  const disconnectFn = () => setHardwareWalletTransport(null);
  const disconnectFnRef = useRef(disconnectFn);
  disconnectFnRef.current = disconnectFn;

  const onHardwareWalletPaired = (args: {transport: Transport}) => {
    const {transport} = args;

    transport.on('disconnect', disconnectFnRef.current);

    setHardwareWalletTransport(transport);
    setConfirmHardwareState('sending');
    startSendingPayment({transport});
  };

  const onSwipeComplete = async () => {
    if (key?.hardwareSource) {
      await onSwipeCompleteHardwareWallet(key);
    } else {
      await startSendingPayment({});
    }
  };

  const onSwipeCompleteHardwareWallet = async (key: Key) => {
    if (key.hardwareSource === 'ledger') {
      if (hardwareWalletTransport) {
        setConfirmHardwareWalletVisible(true);
        startSendingPayment({transport: hardwareWalletTransport});
      } else {
        setConfirmHardwareWalletVisible(true);
      }
    } else {
      showErrorMessage({
        defaultErrorMessage: t('Unsupported hardware wallet'),
        onDismiss: () => reshowWalletSelector(),
      });
    }
  };

  const onCloseModal = async () => {
    await sleep(1000);
    dispatch(AppActions.dismissPaymentSentModal());
    await sleep(1000);
    dispatch(AppActions.clearPaymentSentModalOptions());
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
                <TxDescription
                  txDescription={txp.message}
                  onChange={message => updateTxp({...txp, message})}
                />
              ) : null}
              <Amount
                description={'SubTotal'}
                amount={subTotal}
                height={83}
                hr
                showInfoIcon={!!txp?.payProUrl}
                infoIconOnPress={() => {
                  dispatch(showConfirmAmountInfoSheet('subtotal'));
                }}
              />
              {wallet && fee ? (
                <>
                  <Fee
                    fee={fee}
                    hideFeeOptions
                    feeOptions={GetFeeOptions(wallet.chain)}
                    hr={!showHighFeeWarningMessage}
                  />
                  {showHighFeeWarningMessage ? (
                    <>
                      <Info>
                        <InfoTriangle />
                        <InfoHeader>
                          <InfoImageContainer infoMargin={'0 8px 0 0'}>
                            <WarningSvg />
                          </InfoImageContainer>

                          <InfoTitle>
                            {t('Transaction fees are currently high')}
                          </InfoTitle>
                        </InfoHeader>
                        <InfoDescription>
                          {t(
                            'Due to high demand, miner fees are high. Fees are paid to miners who process transactions and are not paid to BitPay.',
                          )}
                        </InfoDescription>
                      </Info>
                    </>
                  ) : null}
                </>
              ) : null}
              {wallet ? (
                <Amount
                  description={'Total'}
                  amount={total}
                  height={
                    IsERCToken(wallet.currencyAbbreviation, wallet.chain)
                      ? 110
                      : 83
                  }
                  showInfoIcon={true}
                  infoIconOnPress={() => {
                    dispatch(showConfirmAmountInfoSheet('total'));
                  }}
                />
              ) : null}
            </>
          ) : null}
        </DetailsList>

        <WalletSelector
          isVisible={walletSelectorVisible}
          setWalletSelectorVisible={setWalletSelectorVisible}
          walletsAndAccounts={memoizedKeysAndWalletsList}
          onWalletSelect={onWalletSelect}
          onCoinbaseAccountSelect={onCoinbaseAccountSelect}
          supportedTransactionCurrencies={
            invoice.supportedTransactionCurrencies
          }
          onBackdropPress={async () => {
            setWalletSelectorVisible(false);
            if (!wallet && !coinbaseAccount) {
              await sleep(100);
              navigation.goBack();
            }
          }}
        />
        {key?.hardwareSource && wallet ? (
          <ConfirmHardwareWalletModal
            isVisible={isConfirmHardwareWalletModalVisible}
            state={confirmHardwareState}
            hardwareSource={key.hardwareSource}
            transport={hardwareWalletTransport}
            currencyLabel={BitpaySupportedCoins[wallet.chain]?.name}
            onBackdropPress={() => {
              setConfirmHardwareWalletVisible(false);
              setResetSwipeButton(true);
              setConfirmHardwareState(null);
            }}
            onPaired={onHardwareWalletPaired}
          />
        ) : null}
      </ConfirmScrollView>
      {wallet || coinbaseAccount ? (
        <>
          <SwipeButton
            disabled={disableSwipeSendButton}
            title={'Slide to send'}
            forceReset={resetSwipeButton}
            onSwipeComplete={onSwipeComplete}
          />
        </>
      ) : null}
    </ConfirmContainer>
  );
};

export default PayProConfirm;
