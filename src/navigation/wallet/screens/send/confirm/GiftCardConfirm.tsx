import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Hr} from '../../../../../components/styled/Containers';
import {RouteProp, StackActions} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {H4} from '../../../../../components/styled/Text';
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
import {sleep, formatFiatAmount} from '../../../../../utils/helper-methods';
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
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../../constants/config';
import {URL} from '../../../../../constants';
import {
  CardConfig,
  GiftCardDiscount,
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
import {
  GiftCardScreens,
  GiftCardGroupParamList,
} from '../../../../tabs/shop/gift-card/GiftCardGroup';
import {getTransactionCurrencyForPayInvoice} from '../../../../../store/coinbase/coinbase.effects';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getCurrencyCodeFromCoinAndChain} from '../../../../bitpay-id/utils/bitpay-id-utils';
import GiftCardTerms from '../../../../tabs/shop/components/GiftCardTerms';

export interface GiftCardConfirmParamList {
  amount: number;
  cardConfig: CardConfig;
  discounts: GiftCardDiscount[];
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
}

const GiftCardHeader = ({
  amount,
  cardConfig,
}: {
  amount: number;
  cardConfig: CardConfig;
}): JSX.Element | null => {
  const {t} = useTranslation();
  return (
    <>
      <Header hr>
        <>{t(' Gift Card', {displayName: cardConfig.displayName})}</>
      </Header>
      <DetailContainer height={73}>
        <DetailRow>
          <H4>{formatFiatAmount(amount, cardConfig.currency)}</H4>
          <RemoteImage uri={cardConfig.icon} height={40} borderRadius={40} />
        </DetailRow>
      </DetailContainer>
      <Hr style={{marginBottom: 40}} />
    </>
  );
};

const Confirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<GiftCardGroupParamList, 'GiftCardConfirm'>>();
  const {
    amount,
    cardConfig,
    discounts,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
  } = route.params!;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const giftCards = useAppSelector(({SHOP}) => SHOP.giftCards[APP_NETWORK]);

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

  const unsoldGiftCard = giftCards.find(
    giftCard => giftCard.invoiceId === txp?.invoiceID,
  );

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
    [dispatch, keys, invoice],
  );

  const getTransactionCurrency = () => {
    return wallet
      ? wallet.currencyAbbreviation.toUpperCase()
      : coinbaseAccount!.currency.code;
  };

  useEffect(() => {
    return () => {
      dispatch(ShopActions.deletedUnsoldGiftCards());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWalletSelector = async (delay?: number) => {
    if (delay) {
      await sleep(delay);
    }
    setWalletSelectorVisible(true);
  };

  const createGiftCardInvoice = async ({
    clientId,
    transactionCurrency,
  }: {
    clientId: string;
    transactionCurrency: string;
  }) => {
    dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
    dispatch(ShopActions.deletedUnsoldGiftCards());
    const invoiceCreationParams = {
      amount,
      brand: cardConfig.name,
      currency: cardConfig.currency,
      clientId,
      discounts: discounts.map(d => d.code) || [],
      transactionCurrency,
    };
    return dispatch(
      ShopEffects.startCreateGiftCardInvoice(cardConfig, invoiceCreationParams),
    ).catch(err => {
      if (err.message === 'Invoice price must be at least $1 USD') {
        return dispatch(
          ShopEffects.startCreateGiftCardInvoice(cardConfig, {
            ...invoiceCreationParams,
            discounts: [],
          }),
        );
      }
      throw err;
    });
  };

  const handleCreateGiftCardInvoiceOrTxpError = async (err: any) => {
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
      const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
      const paymentUrl = `${baseUrl}/i/${invoiceId}`;
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl,
          invoice: newInvoice,
          invoiceID: invoiceId,
          message: `${formatFiatAmount(amount, cardConfig.currency)} Gift Card`,
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

  const sendPayment = async (twoFactorCode?: string) => {
    dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
    dispatch(
      ShopActions.updatedGiftCardStatus({
        invoiceId: invoice!.id,
        status: 'PENDING',
      }),
    );
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

  const redeemGiftCardAndNavigateToGiftCardDetails = async () => {
    dispatch(startOnGoingProcessModal('GENERATING_GIFT_CARD'));
    const giftCard = await dispatch(
      ShopEffects.startRedeemGiftCard(invoice!.id),
    );
    await sleep(500);
    dispatch(dismissOnGoingProcessModal());
    await sleep(500);
    if (giftCard.status === 'PENDING') {
      dispatch(ShopEffects.waitForConfirmation(giftCard.invoiceId));
    }
    navigation.dispatch(StackActions.popToTop());
    navigation.dispatch(StackActions.pop());
    navigation.navigate('GiftCardDetails', {
      giftCard,
      cardConfig,
    });
    const purchaseEventName =
      giftCard.status === 'FAILURE'
        ? 'Failed Gift Card'
        : 'Purchased Gift Card';
    dispatch(
      Analytics.track(purchaseEventName, {
        giftCardAmount: amount,
        giftCardBrand: cardConfig.name,
        giftCardCurrency: cardConfig.currency,
        coin: getTransactionCurrency(),
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
  };

  const request2FA = async () => {
    navigation.navigate(GiftCardScreens.GIFT_CARD_CONFIRM_TWO_FACTOR, {
      onSubmit: async twoFactorCode => {
        try {
          await sendPayment(twoFactorCode);
          await redeemGiftCardAndNavigateToGiftCardDetails();
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
        <GiftCardHeader amount={amount} cardConfig={cardConfig} />
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
            onSwipeComplete={async () => {
              try {
                await sendPayment();
                await redeemGiftCardAndNavigateToGiftCardDetails();
              } catch (err: any) {
                dispatch(
                  ShopActions.updatedGiftCardStatus({
                    invoiceId: invoice!.id,
                    status: 'UNREDEEMED',
                  }),
                );
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
    </ConfirmContainer>
  );
};

export default Confirm;
