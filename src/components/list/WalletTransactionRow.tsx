import React, {ReactElement} from 'react';
import {BaseText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';

import ConfirmingSvg from '../../../assets/img/wallet/transactions/confirming.svg';
import ErrorSvg from '../../../assets/img/wallet/transactions/failed.svg';
import WalletConnectSvg from '../../../assets/img/wallet/transactions/wallet-connect.svg';
import ShapeShiftSvg from '../../../assets/img/wallet/transactions/shapeshift.svg';
import ChangellySvg from '../../../assets/img/wallet/transactions/changelly.svg';
import OneInchSvg from '../../../assets/img/wallet/transactions/1inch.svg';
import AmazonSvg from '../../../assets/img/wallet/transactions/amazon.svg';
import MercadolivreSvg from '../../../assets/img/wallet/transactions/mercadolivre.svg';
import CoinbaseSvg from '../../../assets/img/wallet/transactions/coinbase.svg';
import BitPaySvg from '../../../assets/img/wallet/transactions/bitpay.svg';
import GiftCardSvg from '../../../assets/img/wallet/transactions/giftcard.svg';
import WalletReverseSvg from '../../../assets/img/wallet/transactions/wallet-reverse.svg';
import SentSvg from '../../../assets/img/wallet/transactions/sent.svg';
import ReceivedSvg from '../../../assets/img/wallet/transactions/received.svg';
import MovedSvg from '../../../assets/img/wallet/transactions/moved.svg';

import {Wallet} from '../../store/wallet/wallet.models';
import {IsCustomERCToken} from '../../store/wallet/utils/currency';
import {WithinPastDay} from '../../store/wallet/utils/time';
import moment from 'moment';
import {SlateDark, White} from '../../styles/colors';
const ICON_SIZE = 35;

const TransactionRow = styled.TouchableOpacity`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
`;

const IconContainer = styled.View`
  margin-right: 10px;
`;

const ActionContainer = styled.View``;

const Action = styled(BaseText)`
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const AmountContainer = styled.View``;

const Amount = styled(BaseText)`
  text-align: right;
  font-weight: 700;
  font-size: 16px;
`;

const CreatedTime = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  text-align: right;
`;

const TransactionsIcons: {[key in string]: ReactElement} = {
  amazon: <AmazonSvg width={ICON_SIZE} height={ICON_SIZE} />,
  walletConnect: <WalletConnectSvg width={ICON_SIZE} height={ICON_SIZE} />,
  shapeshift: <ShapeShiftSvg width={ICON_SIZE} height={ICON_SIZE} />,
  changelly: <ChangellySvg width={ICON_SIZE} height={ICON_SIZE} />,
  oneInch: <OneInchSvg width={ICON_SIZE} height={ICON_SIZE} />,
  mercadolibre: <MercadolivreSvg width={ICON_SIZE} height={ICON_SIZE} />,
  coinbase: <CoinbaseSvg width={ICON_SIZE} height={ICON_SIZE} />,
  debitcard: <BitPaySvg width={ICON_SIZE} height={ICON_SIZE} />,
  giftcards: <GiftCardSvg width={ICON_SIZE} height={ICON_SIZE} />,
  toWalletName: <WalletReverseSvg width={ICON_SIZE} height={ICON_SIZE} />,
  sent: <SentSvg width={ICON_SIZE} height={ICON_SIZE} />,
  received: <ReceivedSvg width={ICON_SIZE} height={ICON_SIZE} />,
  moved: <MovedSvg width={ICON_SIZE} height={ICON_SIZE} />,
};

interface Transaction {
  confirmations: number;
  error: string | null;
  customData?: {service?: string; toWalletName?: string};
  action: string;
  time?: number;
  amountStr?: string;
  amount?: number;
  feeStr?: string;
  outputs?: {address?: string}[];
  note?: {body?: string};
  message?: string;
}

const WalletTransactionRow = ({
  transaction,
  wallet,
  contactsList,
}: {
  transaction: Transaction;
  wallet: Wallet;
  contactsList: any[];
}) => {
  const _onPress = () => {
    //    TODO: Navigate me to transaction details
  };
  const {
    confirmations,
    error,
    customData,
    action,
    time,
    amount,
    amountStr,
    feeStr,
    outputs,
    note,
    message,
  } = transaction;
  const {service: customDataService, toWalletName} = customData || {};
  const {body: noteBody} = note || {};
  // console.log(transaction);
  const {currencyAbbreviation} = wallet;

  const getContactName = (address: string | undefined) => {
    //   TODO: Get name from contacts list
    return;
  };

  const hasContactName = () => {
    return !!(
      contactsList &&
      outputs?.length &&
      getContactName(outputs[0]?.address)
    );
  };

  const getFormattedDate = (time: number) => {
    return WithinPastDay(time)
      ? moment(time).fromNow() + ' ago'
      : moment(time).format('MMM D, YYYY');
  };

  const notZeroAmountEth = () => {
    return !(amount === 0 && currencyAbbreviation === 'eth');
  };

  const isSent = () => {
    return action === 'sent';
  };

  const isMoved = () => {
    return action === 'moved';
  };

  const isReceived = () => {
    return action === 'received';
  };

  const isInvalid = () => {
    return action === 'invalid';
  };

  return (
    <TransactionRow onPress={_onPress}>
      <IconContainer>
        {confirmations <= 0 && <ConfirmingSvg width={ICON_SIZE} />}

        {confirmations > 0 ? (
          (currencyAbbreviation === 'eth' ||
            IsCustomERCToken(currencyAbbreviation)) &&
          error ? (
            <ErrorSvg width={ICON_SIZE} />
          ) : (
            <>
              {isSent() && (
                <>
                  {/*// TODO: Gift cards config*/}
                  {customDataService
                    ? TransactionsIcons[customDataService]
                    : null}

                  {toWalletName && !customDataService
                    ? TransactionsIcons.toWalletName
                    : null}

                  {!customData && !customDataService && !toWalletName
                    ? TransactionsIcons.sent
                    : null}
                </>
              )}
              {isReceived() && TransactionsIcons.received}
              {isMoved() && TransactionsIcons.moved}
            </>
          )
        ) : null}
      </IconContainer>

      <ActionContainer>
        <Action numberOfLines={1} ellipsizeMode={'tail'}>
          {confirmations <= 0 && notZeroAmountEth() ? (
            <>
              {isSent() && !hasContactName() ? 'Sending' : null}
              {isMoved() && !hasContactName() ? 'Moving' : null}
              {(isSent() || isMoved()) && hasContactName()
                ? // @ts-ignore
                  getContactName(outputs[0]?.address)
                : null}
              {isReceived() ? 'Receiving' : null}
            </>
          ) : null}

          {confirmations > 0 && isReceived() ? (
            <>
              {!noteBody && !hasContactName() ? 'Received' : null}
              {noteBody ? noteBody : null}
              {!noteBody && hasContactName()
                ? // @ts-ignore
                  getContactName(outputs[0]?.address)
                : null}
            </>
          ) : null}

          {confirmations > 0 && isSent() && notZeroAmountEth() ? (
            <>
              {!message && !noteBody && !hasContactName() && !toWalletName
                ? 'Sent'
                : null}
              {!message && !noteBody && !hasContactName() && toWalletName
                ? `Sent to ${toWalletName}`
                : null}
              {!noteBody && message ? message : null}
              {noteBody ? noteBody : null}
              {!message && hasContactName()
                ? // @ts-ignore
                  getContactName(outputs[0]?.address)
                : null}
            </>
          ) : null}

          {!notZeroAmountEth() ? 'Interaction with contract' : null}

          {confirmations > 0 && isMoved() ? (
            <>
              {!message && !noteBody ? 'Sent to self' : ''}
              {!noteBody && message ? message : null}
              {noteBody ? noteBody : null}
            </>
          ) : null}

          {confirmations > 0 && isInvalid() ? 'Invalid' : null}
        </Action>
      </ActionContainer>

      <TailContainer>
        <AmountContainer>
          <Amount>
            {!isInvalid() && notZeroAmountEth() ? amountStr : null}

            {!notZeroAmountEth() ? feeStr : null}

            {isInvalid() && '(possible double spend)'}
          </Amount>
        </AmountContainer>

        {time && <CreatedTime>{getFormattedDate(time * 1000)}</CreatedTime>}
      </TailContainer>
    </TransactionRow>
  );
};

export default WalletTransactionRow;
