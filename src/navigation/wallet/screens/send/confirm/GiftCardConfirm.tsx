import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {Hr} from '../../../../../components/styled/Containers';
import {RouteProp} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {H4, TextAlign} from '../../../../../components/styled/Text';
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
  showNoWalletsModal,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {sleep, formatFiatAmount} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import RemoteImage from '../../../../tabs/shop/components/RemoteImage';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {
  WalletSelectMenuBodyContainer,
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../GlobalSelect';
import KeyWalletsRow, {
  KeyWallet,
} from '../../../../../components/list/KeyWalletsRow';
import {ShopActions, ShopEffects} from '../../../../../store/shop';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  DetailContainer,
  DetailRow,
  DetailsList,
  Header,
  SendingFrom,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../../constants/config';
import {Terms} from '../../../../tabs/shop/components/styled/ShopTabComponents';
import {
  CardConfig,
  GiftCardDiscount,
  Invoice,
} from '../../../../../store/shop/shop.models';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
import {
  CoinbaseAccountProps,
  CoinbaseErrorMessages,
} from '../../../../../api/coinbase/coinbase.types';
import {startGetRates} from '../../../../../store/wallet/effects';
import {coinbasePayInvoice} from '../../../../../store/coinbase';

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
  return (
    <>
      <Header hr>
        <>{cardConfig.displayName} Gift Card</>
      </Header>
      <DetailContainer height={73}>
        <DetailRow>
          <H4>
            {formatFiatAmount(amount, cardConfig.currency)}{' '}
            {cardConfig.currency}
          </H4>
          <RemoteImage uri={cardConfig.icon} height={40} borderRadius={40} />
        </DetailRow>
      </DetailContainer>
      <Hr style={{marginBottom: 40}} />
    </>
  );
};

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'GiftCardConfirm'>>();
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

  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const {fee, networkCost, sendingFrom, total} = txDetails || {};
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const unsoldGiftCard = giftCards.find(
    giftCard => giftCard.invoiceId === txp?.invoiceID,
  );

  const memoizedKeysAndWalletsList = useMemo(
    () => dispatch(BuildPayProWalletSelectorList({keys, network: APP_NETWORK})),
    [dispatch, keys],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectModalVisible(true);
  };

  useEffect(() => {
    return () => {
      dispatch(ShopActions.deletedUnsoldGiftCards());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openKeyWalletSelector = () => {
    const {keyWallets, coinbaseWallets} = memoizedKeysAndWalletsList;
    if (keyWallets.length || coinbaseWallets.length) {
      setWalletSelectModalVisible(true);
    } else {
      dispatch(showNoWalletsModal({navigation}));
    }
  };

  const createGiftCardInvoice = async ({
    clientId,
    transactionCurrency,
  }: {
    clientId: string;
    transactionCurrency: string;
  }) => {
    setWalletSelectModalVisible(false);
    // not ideal - will dive into why the timeout has to be this long
    await sleep(400);
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.FETCHING_PAYMENT_INFO),
    );
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
      onDismiss: () => reshowWalletSelector(),
    });
  };

  const onCoinbaseAccountSelect = async (walletRowProps: WalletRowProps) => {
    const selectedCoinbaseAccount = walletRowProps.coinbaseAccount!;
    try {
      const {invoice: newInvoice} = await createGiftCardInvoice({
        clientId: selectedCoinbaseAccount.id,
        transactionCurrency: selectedCoinbaseAccount.currency.code,
      });
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = dispatch(
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
        transactionCurrency: selectedWallet.currencyAbbreviation.toUpperCase(),
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
    dispatch(startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT));
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
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.GENERATING_GIFT_CARD),
    );
    const giftCard = await dispatch(
      ShopEffects.startRedeemGiftCard(invoice!.id),
    );
    await sleep(200);
    dispatch(dismissOnGoingProcessModal());
    await sleep(200);
    if (giftCard.status === 'PENDING') {
      dispatch(ShopEffects.waitForConfirmation(giftCard.invoiceId));
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 2,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Shop'},
          },
          {
            name: 'GiftCard',
            params: {
              screen: 'GiftCardDetails',
              params: {
                giftCard,
                cardConfig,
              },
            },
          },
        ],
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
          title: 'Error',
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
      defaultErrorMessage: 'Could not send transaction',
      onDismiss: () => reshowWalletSelector(),
    });
  };

  const request2FA = async () => {
    navigation.navigate('Wallet', {
      screen: WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR,
      params: {
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
      },
    });
    await sleep(400);
    setResetSwipeButton(true);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => openKeyWalletSelector(), []);

  return (
    <ConfirmContainer>
      <DetailsList>
        <GiftCardHeader amount={amount} cardConfig={cardConfig} />
        {wallet || coinbaseAccount ? (
          <>
            <Header hr>Summary</Header>
            <SendingFrom
              sender={sendingFrom!}
              onPress={openKeyWalletSelector}
              hr
            />
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
              description={'Network Cost'}
              amount={networkCost}
              fiatOnly
              hr
            />
            <Amount description={'Miner fee'} amount={fee} fiatOnly hr />
            <Amount description={'Total'} amount={total} />
            <Terms>{cardConfig.terms}</Terms>
          </>
        ) : null}
      </DetailsList>
      {wallet || coinbaseAccount ? (
        <>
          <SwipeButton
            title={'Slide to send'}
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

      <SheetModal
        isVisible={walletSelectModalVisible}
        onBackdropPress={async () => {
          setWalletSelectModalVisible(false);
          if (!wallet && !coinbaseAccount) {
            await sleep(100);
            navigation.goBack();
          }
        }}>
        <WalletSelectMenuContainer>
          <WalletSelectMenuHeaderContainer>
            <TextAlign align={'center'}>
              <H4>Select a wallet</H4>
            </TextAlign>
          </WalletSelectMenuHeaderContainer>
          <WalletSelectMenuBodyContainer>
            <KeyWalletsRow<KeyWallet>
              keyWallets={memoizedKeysAndWalletsList.keyWallets}
              onPress={onWalletSelect}
            />
            <KeyWalletsRow<WalletRowProps>
              keyWallets={memoizedKeysAndWalletsList.coinbaseWallets}
              keySvg={CoinbaseSmall}
              onPress={onCoinbaseAccountSelect}
            />
          </WalletSelectMenuBodyContainer>
        </WalletSelectMenuContainer>
      </SheetModal>
    </ConfirmContainer>
  );
};

export default Confirm;
