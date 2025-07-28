import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute, StackActions} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletScreens, WalletGroupParamList} from '../../../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  Balance,
  H6,
  Smallest,
  Type,
} from '../../../../../components/styled/Text';
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
  showConfirmAmountInfoSheet,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {sleep, formatFiatAmount} from '../../../../../utils/helper-methods';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  ExchangeRate,
  Header,
  RemainingTime,
  SendingFrom,
  WalletSelector,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {BASE_BITPAY_URLS} from '../../../../../constants/config';
import {CardEffects} from '../../../../../store/card';
import {Card} from '../../../../../store/card/card.models';
import styled from 'styled-components/native';
import {Br} from '../../../../../components/styled/Containers';
import MasterCardSvg from '../../../../../../assets/img/card/bitpay-card-mc.svg';
import VisaCardSvg from '../../../../../../assets/img/card/bitpay-card-visa.svg';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import {startGetRates} from '../../../../../store/wallet/effects';
import {Invoice} from '../../../../../store/shop/shop.models';
import {
  CoinbaseAccountProps,
  CoinbaseErrorMessages,
} from '../../../../../api/coinbase/coinbase.types';
import {coinbasePayInvoice} from '../../../../../store/coinbase';
import {useTranslation} from 'react-i18next';
import {getTransactionCurrencyForPayInvoice} from '../../../../../store/coinbase/coinbase.effects';
import {getCurrencyCodeFromCoinAndChain} from '../../../../bitpay-id/utils/bitpay-id-utils';

export interface DebitCardConfirmParamList {
  amount: number;
  card: Card;
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
}

const CardTermsContainer = styled.View`
  margin: 40px 0 20px;
`;

const CardDetailsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin: 20px 0 10px;
`;

const RightMargin = styled.View`
  margin-right: 10px;
`;

const BalanceContainer = styled.View`
  margin-bottom: 10px;
`;

const Confirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'DebitCardConfirm'>>();
  const {
    amount,
    card,
    wallet: _wallet,
    recipient: _recipient,
    txDetails: _txDetails,
    txp: _txp,
  } = route.params!;

  const {brand, lastFourDigits} = card;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const network = useAppSelector(({APP}) => APP.network);

  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const [wallet, setWallet] = useState(_wallet);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [txp, updateTxp] = useState(_txp);
  const {fee, networkCost, sendingFrom, total, subTotal} = txDetails || {};
  const [disableSwipeSendButton, setDisableSwipeSendButton] = useState(false);

  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const memoizedKeysAndWalletsList = useMemo(
    () =>
      dispatch(
        BuildPayProWalletSelectorList({
          keys,
          network,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
          invoice,
          skipThreshold: true,
        }),
      ),
    [defaultAltCurrency.isoCode, dispatch, keys, network, invoice],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectorVisible(true);
  };

  const openKeyWalletSelector = () => {
    setWalletSelectorVisible(true);
  };

  const createTopUpInvoice = async ({
    walletId,
    transactionCurrency,
  }: {
    walletId: string;
    transactionCurrency: string;
  }) => {
    dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
    const invoiceCurrency = card.currency.code;
    const {invoiceId, invoice: newInvoice} = await dispatch(
      CardEffects.startCreateDebitCardTopUpInvoice(card, {
        invoiceCurrency,
        invoicePrice: amount,
        transactionCurrency,
        walletId,
      }),
    );
    setInvoice(newInvoice);
    return {invoiceId, invoice: newInvoice};
  };

  const handleCreateInvoiceOrTxpError = async (err: any) => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    const errorMessageConfig = await dispatch(handleCreateTxProposalError(err));
    dispatch(
      AppActions.showBottomNotificationModal(
        CustomErrorMessage({
          title: t('Error'),
          errMsg:
            err.response?.data?.message ||
            err.message ||
            errorMessageConfig.message,
          action: () => reshowWalletSelector(),
        }),
      ),
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
      const {invoice: newInvoice} = await createTopUpInvoice({
        walletId: selectedCoinbaseAccount.id,
        transactionCurrency,
      });
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = await dispatch(
        buildTxDetails({
          invoice: newInvoice,
          wallet: walletRowProps,
          rates,
          defaultAltCurrencyIsoCode: card.currency.code,
        }),
      );
      updateTxDetails(newTxDetails);
      setCoinbaseAccount(selectedCoinbaseAccount);
      dispatch(dismissOnGoingProcessModal());
    } catch (err) {
      handleCreateInvoiceOrTxpError(err);
    }
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    try {
      const {invoiceId, invoice: newInvoice} = await createTopUpInvoice({
        walletId: selectedWallet.id,
        transactionCurrency: getCurrencyCodeFromCoinAndChain(
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
        ),
      });
      const baseUrl = BASE_BITPAY_URLS[network];
      const paymentUrl = `${baseUrl}/i/${invoiceId}`;
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl,
          invoiceID: invoiceId,
          invoice: newInvoice,
          message: `${formatFiatAmount(
            amount,
            card.currency.code,
          )} to ${lastFourDigits}`,
          customData: {
            service: 'debitcard',
          },
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
    } catch (err: any) {
      handleCreateInvoiceOrTxpError(err);
    }
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

    dispatch(
      AppActions.showPaymentSentModal({
        isVisible: true,
        onCloseModal,
        title:
          wallet?.credentials?.n > 1
            ? t('Payment Sent')
            : t('Payment Accepted'),
      }),
    );

    await sleep(1200);
    navigation.dispatch(StackActions.popToTop());
    navigation.dispatch(StackActions.pop(3));
  };

  const onCloseModal = async () => {
    await sleep(1000);
    dispatch(AppActions.dismissPaymentSentModal());
    await sleep(1000);
    dispatch(AppActions.clearPaymentSentModalOptions());
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
      onDismiss: () => reshowWalletSelector(),
    });
    await sleep(400);
    setResetSwipeButton(true);
  };

  const request2FA = async () => {
    navigation.navigate(WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR, {
      onSubmit: async twoFactorCode => {
        try {
          await sendPayment(twoFactorCode);
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

  useEffect(() => openKeyWalletSelector(), []);

  return (
    <ConfirmContainer>
      <DetailsList>
        {wallet || coinbaseAccount ? (
          <>
            {brand === 'Mastercard' ? (
              <CardDetailsContainer>
                <RightMargin>
                  <MasterCardSvg height={55} width={55} />
                </RightMargin>
                <RightMargin>
                  <H6>{t('BitPay Card')}</H6>
                </RightMargin>

                <RightMargin>
                  <Type>{t('Virtual')}</Type>
                </RightMargin>

                <Type noAutoMarginLeft={true}>{t('Physical')}</Type>
              </CardDetailsContainer>
            ) : (
              <CardDetailsContainer>
                <RightMargin>
                  <VisaCardSvg height={55} width={55} />
                </RightMargin>
                <H6>{t('BitPay Visa® Card ()', {lastFourDigits})}</H6>
              </CardDetailsContainer>
            )}

            {amount ? (
              <BalanceContainer>
                <Balance scale={false}>
                  {formatFiatAmount(amount, card.currency.code)}
                </Balance>
              </BalanceContainer>
            ) : null}

            <Header hr>Summary</Header>
            {invoice ? (
              <RemainingTime
                invoiceExpirationTime={invoice.expirationTime}
                setDisableSwipeSendButton={setDisableSwipeSendButton}
              />
            ) : null}
            {memoizedKeysAndWalletsList.keyWallets.length === 1 &&
            memoizedKeysAndWalletsList.keyWallets[0].wallets?.length === 1 ? (
              <SendingFrom sender={sendingFrom!} hr />
            ) : (
              <SendingFrom
                sender={sendingFrom!}
                onPress={openKeyWalletSelector}
                hr
              />
            )}
            {txDetails?.rateStr ? (
              <ExchangeRate
                description={t('Exchange Rate')}
                rateStr={txDetails?.rateStr}
              />
            ) : null}
            <Amount
              description={t('Network Cost')}
              amount={networkCost}
              fiatOnly
              hr
            />
            <Amount
              description={t('SubTotal')}
              amount={subTotal}
              hr
              showInfoIcon={!!networkCost}
              infoIconOnPress={() => {
                dispatch(showConfirmAmountInfoSheet('subtotal'));
              }}
            />

            <Amount description={t('Miner fee')} amount={fee} fiatOnly hr />

            <Amount
              description={t('Total')}
              amount={total}
              showInfoIcon={!!subTotal}
              infoIconOnPress={() => {
                dispatch(showConfirmAmountInfoSheet('total'));
              }}
            />

            <CardTermsContainer>
              <Smallest>
                {t(
                  'BY USING THIS CARD YOU AGREE WITH THE TERMS AND CONDITIONS OF THE CARDHOLDER AGREEMENT AND FEE SCHEDULE, IF ANY. This card is issued by Metropolitan Commercial Bank (Member FDIC) pursuant to a license from Mastercard International. "Metropolitan Commercial Bank" and "Metropolitan" are registered trademarks of Metropolitan Commercial Bank ©2014.',
                )}
              </Smallest>
              <Br />
              <Smallest>
                {t(
                  'Mastercard is a registered trademark and the circles design is a trademark of Mastercard International Incorporated.',
                )}
              </Smallest>
            </CardTermsContainer>
          </>
        ) : null}
      </DetailsList>
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
                  Analytics.track('Adding funds to Debit Card', {
                    amount: amount,
                    brand: brand || '',
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
