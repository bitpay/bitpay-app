import Transport from '@ledgerhq/hw-transport';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import styled from 'styled-components/native';
import {Hr} from '../../../../../components/styled/Containers';
import {RouteProp, StackActions} from '@react-navigation/core';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../../utils/hooks';
import {BaseText, H4} from '../../../../../components/styled/Text';
import {
  Key,
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
  handleSendError,
  removeTxp,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {
  sleep,
  formatFiatAmount,
  toggleThenUntoggle,
} from '../../../../../utils/helper-methods';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import RemoteImage from '../../../../tabs/shop/components/RemoteImage';
import {ShopActions, ShopEffects} from '../../../../../store/shop';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  DetailContainer,
  DetailRow,
  DetailsList,
  ExchangeRate,
  Header,
  SendingFrom,
  WalletSelector,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {BASE_BITPAY_URLS} from '../../../../../constants/config';
import {URL} from '../../../../../constants';
import {
  CardConfig,
  GiftCardCoupon,
  Invoice,
} from '../../../../../store/shop/shop.models';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import {
  CoinbaseAccountProps,
  CoinbaseErrorMessages,
} from '../../../../../api/coinbase/coinbase.types';
import {startGetRates} from '../../../../../store/wallet/effects';
import {coinbasePayInvoice} from '../../../../../store/coinbase';
import {useTranslation} from 'react-i18next';
import {GiftCardGroupParamList} from '../../../../tabs/shop/gift-card/GiftCardGroup';
import {getTransactionCurrencyForPayInvoice} from '../../../../../store/coinbase/coinbase.effects';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getCurrencyCodeFromCoinAndChain} from '../../../../bitpay-id/utils/bitpay-id-utils';
import GiftCardTerms from '../../../../tabs/shop/components/GiftCardTerms';
import {WalletScreens} from '../../../../../navigation/wallet/WalletGroup';
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
import {
  getBoostAmount,
  getBoostedAmount,
  getVisibleCoupon,
  hasVisibleBoost,
} from '../../../../../lib/gift-cards/gift-card';
import GiftCardDiscountText from '../../../../../navigation/tabs/shop/components/GiftCardDiscountText';

export interface GiftCardConfirmParamList {
  amount: number;
  cardConfig: CardConfig;
  coupons: GiftCardCoupon[];
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
}

const BoostAppliedText = styled(BaseText)`
  margin-left: 10px;
`;

enum GiftCardInvoiceCreationErrors {
  couponExpired = 'This promotion is no longer available.',
  atLeast1USD = 'Invoice price must be at least $1 USD',
}

const GiftCardHeader = ({
  amount,
  cardConfig,
}: {
  amount: number;
  cardConfig: CardConfig;
}): JSX.Element | null => {
  const {t} = useTranslation();
  const boostedAmount = getBoostedAmount(cardConfig, amount);
  return (
    <>
      <Header hr>
        <>{t(' Gift Card', {displayName: cardConfig.displayName})}</>
      </Header>
      <DetailContainer height={73}>
        <DetailRow>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <H4>{formatFiatAmount(boostedAmount, cardConfig.currency)}</H4>
            <BoostAppliedText>
              {hasVisibleBoost(cardConfig) ? (
                <>
                  <GiftCardDiscountText
                    cardConfig={cardConfig}
                    short={true}
                    applied={true}
                    fontWeight={400}
                    fontSize={16}
                  />
                </>
              ) : null}
            </BoostAppliedText>
          </View>
          <RemoteImage uri={cardConfig.icon} height={40} borderRadius={40} />
        </DetailRow>
      </DetailContainer>
      <Hr style={{marginBottom: 40}} />
    </>
  );
};

const MemoizedGiftCardHeader = React.memo(GiftCardHeader);

const Confirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const logger = useLogger();
  const route =
    useRoute<RouteProp<GiftCardGroupParamList, 'GiftCardConfirm'>>();
  const {
    amount,
    cardConfig,
    coupons,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
  } = route.params!;
  const appNetwork = useAppSelector(({APP}) => APP.network);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const giftCards = useAppSelector(({SHOP}) => SHOP.giftCards[appNetwork]);
  const boostedAmount = getBoostedAmount(cardConfig, amount);

  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const {fee, networkCost, sendingFrom, total, rateStr} = txDetails || {};
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [disableSwipeSendButton, setDisableSwipeSendButton] = useState(false);

  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);

  const unsoldGiftCard = giftCards.find(
    giftCard => giftCard.invoiceId === txp?.invoiceID,
  );

  const memoizedKeysAndWalletsList = useMemo(
    () =>
      dispatch(
        BuildPayProWalletSelectorList({
          keys,
          network: appNetwork,
          invoice,
          skipThreshold: true,
        }),
      ),
    [dispatch, keys, appNetwork, invoice],
  );

  const getTransactionCurrency = () => {
    return wallet
      ? wallet.currencyAbbreviation.toUpperCase()
      : coinbaseAccount!.currency.code;
  };

  useEffect(() => {
    return () => {
      dispatch(ShopActions.deletedUnsoldGiftCards({network: appNetwork}));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWalletSelector = async (delay: number = 0): Promise<void> => {
    if (delay) {
      await sleep(delay);
    }
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

  const createGiftCardInvoice = async ({
    clientId,
    transactionCurrency,
  }: {
    clientId: string;
    transactionCurrency: string;
  }) => {
    dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
    dispatch(ShopActions.deletedUnsoldGiftCards({network: appNetwork}));
    const invoiceCreationParams = {
      amount: boostedAmount,
      brand: cardConfig.name,
      currency: cardConfig.currency,
      clientId,
      coupons: coupons.map(c => c.code) || [],
      transactionCurrency,
    };
    return dispatch(
      ShopEffects.startCreateGiftCardInvoice(cardConfig, invoiceCreationParams),
    ).catch(err => {
      if (err.message === GiftCardInvoiceCreationErrors.atLeast1USD) {
        return dispatch(
          ShopEffects.startCreateGiftCardInvoice(cardConfig, {
            ...invoiceCreationParams,
            coupons: [],
          }),
        );
      }
      if (err.message === GiftCardInvoiceCreationErrors.couponExpired) {
        dispatch(
          ShopActions.hidGiftCardCoupon({
            giftCardBrand: cardConfig.name,
            couponCode: invoiceCreationParams.coupons[0],
          }),
        );
      }
      throw err;
    });
  };

  const popToShopHome = async () => {
    navigation.dispatch(StackActions.popToTop());
    navigation.dispatch(StackActions.pop());
  };

  const handleCreateGiftCardInvoiceOrTxpError = async (err: any) => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    const onDismiss = () => {
      if (err.message === GiftCardInvoiceCreationErrors.couponExpired) {
        return popToShopHome();
      }
      return openWalletSelector();
    };
    const [errorConfig] = await Promise.all([
      dispatch(handleCreateTxProposalError(err, onDismiss)),
      sleep(500),
    ]);
    dispatch(
      AppActions.showBottomNotificationModal({
        ...errorConfig,
        message:
          err.response?.data?.message || err.message || errorConfig.message,
      }),
    );
  };

  const onCoinbaseAccountSelect = async (walletRowProps: WalletRowProps) => {
    const selectedCoinbaseAccount = walletRowProps.coinbaseAccount!;
    const transactionCurrency = dispatch(
      getTransactionCurrencyForPayInvoice(
        selectedCoinbaseAccount.currency.code,
      ),
    );
    try {
      const {invoice: newInvoice} = await createGiftCardInvoice({
        clientId: selectedCoinbaseAccount.id,
        transactionCurrency,
      });
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = await dispatch(
        buildTxDetails({
          invoice: newInvoice,
          wallet: walletRowProps,
          rates,
          defaultAltCurrencyIsoCode: cardConfig.currency,
        }),
      );
      updateTxDetails(newTxDetails);
      setInvoice(newInvoice);
      setCoinbaseAccount(selectedCoinbaseAccount);
      dispatch(dismissOnGoingProcessModal());
    } catch (err) {
      handleCreateGiftCardInvoiceOrTxpError(err);
    }
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    try {
      const {invoice: newInvoice, invoiceId} = await createGiftCardInvoice({
        clientId: selectedWallet.id,
        transactionCurrency: getCurrencyCodeFromCoinAndChain(
          selectedWallet.currencyAbbreviation.toUpperCase(),
          selectedWallet.chain,
        ),
      });
      const baseUrl = BASE_BITPAY_URLS[appNetwork];
      const paymentUrl = `${baseUrl}/i/${invoiceId}`;
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl,
          invoice: newInvoice,
          invoiceID: invoiceId,
          message: `${formatFiatAmount(
            boostedAmount,
            cardConfig.currency,
          )} Gift Card`,
          customData: {
            giftCardName: cardConfig.name,
            service: 'giftcards',
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
      setInvoice(newInvoice);
      dispatch(dismissOnGoingProcessModal());
    } catch (err: any) {
      handleCreateGiftCardInvoiceOrTxpError(err);
    }
  };

  const sendPaymentAndRedeemGiftCard = async ({
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
        } else {
          throw new Error('missing txp, wallet, or recipient');
        }
      } else {
        dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
        dispatch(
          ShopActions.updatedGiftCardStatus({
            invoiceId: invoice!.id,
            status: 'PENDING',
            network: appNetwork,
          }),
        );
        txp && wallet && recipient
          ? await dispatch(startSendPayment({txp, key, wallet, recipient}))
          : await dispatch(
              coinbasePayInvoice(
                invoice!.id,
                coinbaseAccount!.currency.code,
                twoFactorCode,
              ),
            );
      }
      await redeemGiftCardAndNavigateToGiftCardDetails();
    } catch (err: any) {
      if (isUsingHardwareWallet) {
        setConfirmHardwareWalletVisible(false);
        setConfirmHardwareState(null);
        err = getLedgerErrorMessage(err);
      }
      dispatch(
        ShopActions.updatedGiftCardStatus({
          invoiceId: invoice!.id,
          status: 'UNREDEEMED',
          network: appNetwork,
        }),
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);
      const twoFactorRequired =
        coinbaseAccount &&
        err?.message?.includes(CoinbaseErrorMessages.twoFactorRequired);
      try {
        twoFactorRequired
          ? await request2FA()
          : await handlePaymentFailure(err);
      } finally {
        setDisableSwipeSendButton(false);
      }
    }
  };

  const redeemGiftCardAndNavigateToGiftCardDetails = async () => {
    const giftCard = await dispatch(
      ShopEffects.startRedeemGiftCard(invoice!.id),
    );
    await sleep(500);
    dispatch(dismissOnGoingProcessModal());
    await sleep(500);
    if (giftCard.status === 'PENDING') {
      dispatch(ShopEffects.waitForConfirmation(giftCard.invoiceId));
    }
    popToShopHome();
    navigation.navigate('GiftCardDetails', {
      giftCard,
      cardConfig,
    });
    const purchaseEventName =
      giftCard.status === 'FAILURE'
        ? 'Failed Gift Card'
        : 'Purchased Gift Card';
    const visibleCoupon = getVisibleCoupon(cardConfig);
    dispatch(
      Analytics.track(purchaseEventName, {
        giftCardAmount: amount,
        giftCardBrand: cardConfig.name,
        giftCardCurrency: cardConfig.currency,
        coin: getTransactionCurrency(),
        ...(visibleCoupon && {visibleCoupon}),
      }),
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
    const handled = dispatch(
      handleSendError({error, onDismiss: () => openWalletSelector()}),
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
      setInvoice(undefined);
      setCoinbaseAccount(undefined);
    }
    toggleThenUntoggle(setResetSwipeButton);
  };

  const request2FA = async () => {
    navigation.navigate(WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR, {
      onSubmit: async (twoFactorCode: string) => {
        try {
          await sendPaymentAndRedeemGiftCard({twoFactorCode});
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
    toggleThenUntoggle(setResetSwipeButton);
  };

  // on hardware wallet disconnect, just clear the cached transport object
  // errors will be thrown and caught as needed in their respective workflows
  const disconnectFn = () => setHardwareWalletTransport(null);
  const disconnectFnRef = useRef(disconnectFn);
  disconnectFnRef.current = disconnectFn;

  const onHardwareWalletPaired = async (args: {transport: Transport}) => {
    const {transport} = args;

    transport.on('disconnect', disconnectFnRef.current);

    setHardwareWalletTransport(transport);
    sendPaymentAndRedeemGiftCard({transport});
  };

  const onSwipeComplete = async () => {
    if (disableSwipeSendButton) {
      return;
    }
    setDisableSwipeSendButton(true);
    logger.debug('Swipe completed. Making payment...');
    if (key?.hardwareSource) {
      await onSwipeCompleteHardwareWallet(key);
    } else {
      await sendPaymentAndRedeemGiftCard({});
    }
  };

  const onSwipeCompleteHardwareWallet = async (key: Key) => {
    if (key.hardwareSource === 'ledger') {
      if (hardwareWalletTransport) {
        setConfirmHardwareWalletVisible(true);
        sendPaymentAndRedeemGiftCard({transport: hardwareWalletTransport});
      } else {
        setConfirmHardwareWalletVisible(true);
      }
    } else {
      showError({
        defaultErrorMessage: t('Unsupported hardware wallet'),
      });
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

  useFocusEffect(
    useCallback(() => {
      openWalletSelector();
    }, []),
  );

  return (
    <ConfirmContainer>
      <DetailsList>
        <MemoizedGiftCardHeader amount={amount} cardConfig={cardConfig} />
        {wallet || coinbaseAccount ? (
          <>
            <Header hr>Summary</Header>
            <SendingFrom
              sender={sendingFrom!}
              onPress={openWalletSelector}
              hr
            />
            {rateStr ? (
              <ExchangeRate
                description={t('Exchange Rate')}
                rateStr={rateStr}
              />
            ) : null}
            {unsoldGiftCard && unsoldGiftCard.totalDiscount ? (
              getBoostAmount(cardConfig, amount) ? (
                <Amount
                  description={'Subtotal'}
                  amount={{
                    fiatAmount: formatFiatAmount(amount, cardConfig.currency),
                    cryptoAmount: '',
                  }}
                  fiatOnly
                  hr
                />
              ) : (
                <Amount
                  description={'Discount'}
                  amount={{
                    fiatAmount: `— ${formatFiatAmount(
                      unsoldGiftCard.totalDiscount,
                      cardConfig.currency,
                    )}`,
                    cryptoAmount: '',
                  }}
                  fiatOnly
                  hr
                />
              )
            ) : null}
            <Amount
              description={t('Network Cost')}
              amount={networkCost}
              fiatOnly
              hr
              showInfoIcon={true}
              infoIconOnPress={async () => {
                await sleep(400);
                dispatch(openUrlWithInAppBrowser(URL.HELP_PAYPRO_NETWORK_COST));
              }}
            />
            <Amount
              description={t('Miner fee')}
              amount={fee}
              fiatOnly
              hr
              showInfoIcon={true}
              infoIconOnPress={async () => {
                await sleep(400);
                dispatch(openUrlWithInAppBrowser(URL.HELP_MINER_FEES));
              }}
            />
            <Amount description={t('Total')} amount={total} />
            <GiftCardTerms terms={cardConfig.terms} />
          </>
        ) : null}
      </DetailsList>
      {wallet || coinbaseAccount ? (
        <>
          <SwipeButton
            title={t('Slide to send')}
            forceReset={resetSwipeButton}
            onSwipeComplete={onSwipeComplete}
          />
        </>
      ) : null}

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
    </ConfirmContainer>
  );
};

export default Confirm;
