import React, {ReactElement} from 'react';
import AmazonSvg from '../../assets/img/wallet/transactions/amazon.svg';
import WalletConnectSvg from '../../assets/img/wallet/transactions/wallet-connect.svg';
import ShapeShiftSvg from '../../assets/img/wallet/transactions/shapeshift.svg';
import ChangellySvg from '../../assets/img/wallet/transactions/changelly.svg';
import OneInchSvg from '../../assets/img/wallet/transactions/1inch.svg';
import MercadolivreSvg from '../../assets/img/wallet/transactions/mercadolivre.svg';
import CoinbaseSvg from '../../assets/img/wallet/transactions/coinbase.svg';
import BitPaySvg from '../../assets/img/wallet/transactions/bitpay.svg';
import GiftCardSvg from '../../assets/img/wallet/transactions/giftcard.svg';
import SentSvg from '../../assets/img/wallet/transactions/sent.svg';
import ReceivedSvg from '../../assets/img/wallet/transactions/received.svg';
import MovedSvg from '../../assets/img/wallet/transactions/moved.svg';
import ConfirmingSvg from '../../assets/img/wallet/transactions/confirming.svg';
import ErrorSvg from '../../assets/img/wallet/transactions/failed.svg';
import {TRANSACTION_ICON_SIZE} from '../store/wallet/effects/transactions/transactions';

export const TransactionIcons: {[key in string]: ReactElement} = {
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
  confirming: (
    <ConfirmingSvg
      width={TRANSACTION_ICON_SIZE}
      height={TRANSACTION_ICON_SIZE}
    />
  ),
  error: (
    <ErrorSvg width={TRANSACTION_ICON_SIZE} height={TRANSACTION_ICON_SIZE} />
  ),
};
