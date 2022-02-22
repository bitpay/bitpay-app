import React, {ReactElement, memo} from 'react';
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
import SentSvg from '../../../assets/img/wallet/transactions/sent.svg';
import ReceivedSvg from '../../../assets/img/wallet/transactions/received.svg';
import MovedSvg from '../../../assets/img/wallet/transactions/moved.svg';

import {Wallet} from '../../store/wallet/wallet.models';
import {IsCustomERCToken} from '../../store/wallet/utils/currency';
import {WithinPastDay} from '../../store/wallet/utils/time';
import moment from 'moment';
import {SlateDark, White} from '../../styles/colors';
export const TRANSACTION_ICON_SIZE = 35;
export const TRANSACTION_ROW_HEIGHT = 75;

const TransactionRow = styled.TouchableOpacity`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
  height: ${TRANSACTION_ROW_HEIGHT}px;
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
  amazon: (
    <AmazonSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  walletConnect: (
    <WalletConnectSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  shapeshift: (
    <ShapeShiftSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  changelly: (
    <ChangellySvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  oneInch: (
    <OneInchSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  mercadolibre: (
    <MercadolivreSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  coinbase: (
    <CoinbaseSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  debitcard: (
    <BitPaySvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  giftcards: (
    <GiftCardSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  sent: (
    <SentSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  received: (
    <ReceivedSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
  moved: (
    <MovedSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
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
      ? moment(time).fromNow()
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
        {confirmations <= 0 && <ConfirmingSvg width={TRANSACTION_ICON_SIZE} />}

        {confirmations > 0 ? (
          (currencyAbbreviation === 'eth' ||
            IsCustomERCToken(currencyAbbreviation)) &&
          error ? (
            <ErrorSvg width={TRANSACTION_ICON_SIZE} />
          ) : (
            <>
              {isSent() && (
                <>
                  {/*// TODO: Gift cards config*/}
                  {customDataService
                    ? TransactionsIcons[customDataService]
                    : TransactionsIcons.sent}
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

export default memo(WalletTransactionRow);
