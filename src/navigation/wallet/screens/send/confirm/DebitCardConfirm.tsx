import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  Balance,
  H4,
  H6,
  Smallest,
  TextAlign,
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
  showNoWalletsModal,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {sleep, formatFiatAmount} from '../../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {
  WalletSelectMenuBodyContainer,
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../GlobalSelect';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
import KeyWalletsRow from '../../../../../components/list/KeyWalletsRow';
import {BuildPayProWalletSelectorList} from '../../../../../store/wallet/utils/wallet';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  Header,
  SendingFrom,
  SharedDetailRow,
} from './Shared';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../components/ErrorMessages';
import {BASE_BITPAY_URLS} from '../../../../../constants/config';
import {CardEffects} from '../../../../../store/card';
import PaymentSent from '../../../components/PaymentSent';
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
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'DebitCardConfirm'>>();
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

  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [coinbaseAccount, setCoinbaseAccount] =
    useState<CoinbaseAccountProps>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [txp, updateTxp] = useState(_txp);
  const {fee, networkCost, sendingFrom, total, subTotal} = txDetails || {};
  const [disableSwipeSendButton, setDisableSwipeSendButton] = useState(false);

  const [remainingTime, setRemainingTime] = useState<string>();
  const [invoiceExpirationTime, setInvoiceExpirationTime] = useState<number>();
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const memoizedKeysAndWalletsList = useMemo(
    () => dispatch(BuildPayProWalletSelectorList({keys, network})),
    [dispatch, keys, network],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectModalVisible(true);
  };

  const openKeyWalletSelector = () => {
    const {keyWallets, coinbaseWallets} = memoizedKeysAndWalletsList;
    if (keyWallets.length || coinbaseWallets.length) {
      if (
        keyWallets.length === 1 &&
        keyWallets[0].wallets.length === 1 &&
        coinbaseWallets.length === 0
      ) {
        onWalletSelect(keyWallets[0].wallets[0]);
        return;
      }
      if (
        coinbaseWallets.length === 1 &&
        coinbaseWallets[0].wallets.length === 1 &&
        keyWallets.length === 0
      ) {
        onCoinbaseAccountSelect(coinbaseWallets[0].wallets[0]);
        return;
      }
      setWalletSelectModalVisible(true);
    } else {
      dispatch(showNoWalletsModal({navigation}));
    }
  };

  const createTopUpInvoice = async ({
    walletId,
    transactionCurrency,
  }: {
    walletId: string;
    transactionCurrency: string;
  }) => {
    setWalletSelectModalVisible(false);
    // Wait to close wallet selection modal
    await sleep(500);
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.FETCHING_PAYMENT_INFO),
    );
    const invoiceCurrency = card.currency.code;
    const {invoiceId, invoice: newInvoice} = await dispatch(
      CardEffects.startCreateDebitCardTopUpInvoice(card, {
        invoiceCurrency,
        invoicePrice: amount,
        transactionCurrency,
        walletId,
      }),
    );
    setInvoiceExpirationTime(
      Math.floor(new Date(newInvoice.expirationTime).getTime() / 1000),
    );
    setInvoice(newInvoice);
    return {invoiceId, invoice: newInvoice};
  };

  const handleCreateInvoiceOrTxpError = async (err: any) => {
    await sleep(400);
    dispatch(dismissOnGoingProcessModal());
    const [errorConfig] = await Promise.all([
      dispatch(handleCreateTxProposalError(err)),
      sleep(500),
    ]);
    dispatch(
      AppActions.showBottomNotificationModal(
        CustomErrorMessage({
          title: 'Error',
          errMsg:
            err.response?.data?.message || err.message || errorConfig.message,
          action: () => reshowWalletSelector(),
        }),
      ),
    );
  };

  const onCoinbaseAccountSelect = async (walletRowProps: WalletRowProps) => {
    const selectedCoinbaseAccount = walletRowProps.coinbaseAccount!;
    try {
      const {invoice: newInvoice} = await createTopUpInvoice({
        walletId: selectedCoinbaseAccount.id,
        transactionCurrency: selectedCoinbaseAccount.currency.code,
      });
      const rates = await dispatch(startGetRates({}));
      const newTxDetails = dispatch(
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
        transactionCurrency: selectedWallet.currencyAbbreviation.toUpperCase(),
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
    dispatch(startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT));
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

  useEffect(() => {
    let interval: any;
    if (invoiceExpirationTime) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);

        if (now > invoiceExpirationTime) {
          setRemainingTime('Expired');
          setDisableSwipeSendButton(true);
          clearInterval(interval);
          return;
        }

        const totalSecs = invoiceExpirationTime - now;
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;

        const _remainingTimeStr =
          ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
        setRemainingTime(_remainingTimeStr);
      }, 1000); //each count lasts for a second
    }
    //cleanup the interval on complete
    if (interval) {
      return () => clearInterval(interval);
    }
  }, [invoiceExpirationTime]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  <H6>BitPay Card</H6>
                </RightMargin>

                <RightMargin>
                  <Type>Virtual</Type>
                </RightMargin>

                <Type noAutoMarginLeft={true}>Physical</Type>
              </CardDetailsContainer>
            ) : (
              <CardDetailsContainer>
                <RightMargin>
                  <VisaCardSvg height={55} width={55} />
                </RightMargin>
                <H6>BitPay Visa&reg; Card ({lastFourDigits})</H6>
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
            {memoizedKeysAndWalletsList.keyWallets.length === 1 &&
            memoizedKeysAndWalletsList.keyWallets[0].wallets.length === 1 ? (
              <SendingFrom sender={sendingFrom!} hr />
            ) : (
              <SendingFrom
                sender={sendingFrom!}
                onPress={openKeyWalletSelector}
                hr
              />
            )}
            {remainingTime ? (
              <SharedDetailRow
                description={'Expires'}
                value={remainingTime}
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

            <Amount description={'SubTotal'} amount={subTotal} />

            <Amount description={'Total'} amount={total} />

            <CardTermsContainer>
              <Smallest>
                BY USING THIS CARD YOU AGREE WITH THE TERMS AND CONDITIONS OF
                THE CARDHOLDER AGREEMENT AND FEE SCHEDULE, IF ANY. This card is
                issued by Metropolitan Commercial Bank (Member FDIC) pursuant to
                a license from Mastercard International. "Metropolitan
                Commercial Bank" and "Metropolitan" are registered trademarks of
                Metropolitan Commercial Bank ©2014.
              </Smallest>
              <Br />
              <Smallest>
                Mastercard is a registered trademark and the circles design is a
                trademark of Mastercard International Incorporated.
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
            <KeyWalletsRow
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

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          navigation.dispatch(
            CommonActions.reset({
              index: 2,
              routes: [
                {
                  name: 'Tabs',
                  params: {screen: 'Card'},
                },
              ],
            }),
          );
          await sleep(300);
          setShowPaymentSentModal(false);
        }}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
