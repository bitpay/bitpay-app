import React, {useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../../WalletStack';
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
  createPayProTxProposal,
  handleCreateTxProposalError,
  removeTxp,
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
import KeyWalletsRow, {
  KeyWalletsRowProps,
} from '../../../../../components/list/KeyWalletsRow';
import {BuildKeysAndWalletsList} from '../../../../../store/wallet/utils/wallet';
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

export interface DebitCardConfirmParamList {
  amount: number;
  card: Card;
  wallet?: Wallet;
  recipient?: Recipient;
  txp?: TransactionProposal;
  txDetails?: TxDetails;
}

const CardTermsContainer = styled.View`
  margin-top: 40px;
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

  const {brand, cardType, lastFourDigits} = card;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const network = useAppSelector(({APP}) => APP.network);

  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  const [key, setKey] = useState(keys[_wallet ? _wallet.keyId : '']);
  const [wallet, setWallet] = useState(_wallet);
  const [recipient, setRecipient] = useState(_recipient);
  const [txDetails, updateTxDetails] = useState(_txDetails);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [txp, updateTxp] = useState(_txp);
  const [keyWallets, setKeysWallets] = useState<KeyWalletsRowProps[]>();
  const {fee, networkCost, sendingFrom, total, subTotal} = txDetails || {};

  const [remainingTime, setRemainingTime] = useState<string>();
  const [invoiceExpirationTime, setInvoiceExpirationTime] = useState<number>();
  const memoizedKeysAndWalletsList = useMemo(
    () => BuildKeysAndWalletsList({keys, network}),
    [keys, network],
  );

  const reshowWalletSelector = async () => {
    await sleep(400);
    setWalletSelectModalVisible(true);
  };

  const openKeyWalletSelector = () => {
    setKeysWallets(memoizedKeysAndWalletsList);
    setWalletSelectModalVisible(true);
  };

  const onWalletSelect = async (selectedWallet: Wallet) => {
    setWalletSelectModalVisible(false);
    // Wait to close wallet selection modal
    await sleep(500);
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.FETCHING_PAYMENT_INFO),
    );
    const invoiceCurrency = card.currency.code;
    try {
      const {invoiceId, invoice} = await dispatch(
        CardEffects.startCreateDebitCardTopUpInvoice(card, {
          invoiceCurrency,
          invoicePrice: amount,
          transactionCurrency:
            selectedWallet.currencyAbbreviation.toUpperCase(),
          walletId: selectedWallet.id,
        }),
      );
      const baseUrl = BASE_BITPAY_URLS[network];
      const paymentUrl = `${baseUrl}/i/${invoiceId}`;
      const {txDetails: newTxDetails, txp: newTxp} = await dispatch(
        await createPayProTxProposal({
          wallet: selectedWallet,
          paymentUrl,
          invoiceID: invoiceId,
          invoice,
          message: `${formatFiatAmount(amount, invoiceCurrency)} Top-Up`,
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
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      const [errorConfig] = await Promise.all([
        handleCreateTxProposalError(err),
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
    }
  };

  useEffect(() => {
    let interval: any;
    if (invoiceExpirationTime) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);

        if (now > invoiceExpirationTime) {
          setRemainingTime('Expired');
          clearInterval(interval);
          return;
        }

        const totalSecs = invoiceExpirationTime - now;
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;

        const _remainingTimeStr =
          ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
        setRemainingTime(_remainingTimeStr);
      }, 1000);
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
        {txp && recipient && wallet ? (
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

            {subTotal?.fiatAmount ? (
              <BalanceContainer>
                <Balance scale={false}>{subTotal.fiatAmount}</Balance>
              </BalanceContainer>
            ) : null}

            <Header hr>Summary</Header>
            <SendingFrom
              sender={sendingFrom!}
              onPress={openKeyWalletSelector}
              hr
            />
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
      {txp && recipient && wallet ? (
        <>
          <SwipeButton
            title={'Slide to send'}
            onSwipeComplete={async () => {
              try {
                dispatch(
                  startOnGoingProcessModal(
                    OnGoingProcessMessages.SENDING_PAYMENT,
                  ),
                );
                await sleep(400);
                await dispatch(startSendPayment({txp, key, wallet, recipient}));
                dispatch(dismissOnGoingProcessModal());
                await sleep(400);
                setShowPaymentSentModal(true);
              } catch (err: any) {
                await removeTxp(wallet, txp).catch(removeErr =>
                  console.error('error deleting txp', removeErr),
                );
                dispatch(dismissOnGoingProcessModal());
                await sleep(400);
                updateTxDetails(undefined);
                updateTxp(undefined);
                setWallet(undefined);
                dispatch(
                  AppActions.showBottomNotificationModal(
                    CustomErrorMessage({
                      title: 'Error',
                      errMsg: err.message || 'Could not send transaction',
                      action: () => reshowWalletSelector(),
                    }),
                  ),
                );
              }
            }}
          />
        </>
      ) : null}

      <SheetModal
        isVisible={walletSelectModalVisible}
        onBackdropPress={() => setWalletSelectModalVisible(false)}>
        <WalletSelectMenuContainer>
          <WalletSelectMenuHeaderContainer>
            <TextAlign align={'center'}>
              <H4>Select a wallet</H4>
            </TextAlign>
          </WalletSelectMenuHeaderContainer>
          <WalletSelectMenuBodyContainer>
            <KeyWalletsRow keyWallets={keyWallets!} onPress={onWalletSelect} />
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
