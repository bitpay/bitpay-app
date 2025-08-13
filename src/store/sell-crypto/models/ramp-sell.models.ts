import {WithdrawalMethodKey} from '../../../navigation/services/sell-crypto/constants/SellCryptoConstants';
import {RampAssetInfo} from '../../buy-crypto/models/ramp.models';

export type RampSellEnv = 'sandbox' | 'production';

// export type RampPayoutMethodType = 'card' | 'sepa';

export type RampSellOrderStatus =
  | 'createdOrder'
  | 'bitpayTxSent'
  | 'bitpayFromCheckout'
  | 'created'
  | 'released'
  | 'expired';

export interface RampSellOrderData {
  env: 'dev' | 'prod';
  wallet_id: string;
  address_to: string;
  coin: string;
  chain: string;
  created_on: number;
  crypto_amount: number;
  fiat_receiving_amount: number;
  fiat_fee_amount?: number;
  fiat_currency: string;
  payment_method?: WithdrawalMethodKey | undefined; // bitpay-app payment method id
  external_id: string; // bitpay-app custom id
  status: RampSellOrderStatus;
  sale_view_token: string;
  transaction_id?: string; // // id form ramp
  quote_id?: string; // quote id form ramp
  send_max?: boolean;
  tx_sent_on?: number;
  tx_sent_id?: string;
}

export interface RampSellIncomingData {
  rampExternalId: string;
  transactionId?: string;
  status?: RampSellOrderStatus;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: string | number; // cryptoAmount
  fiatAmount?: number;
  fiatCurrencyCode?: string;
  paymentMethod?: WithdrawalMethodKey;
  totalFee?: number;
  depositWalletAddress?: string;
  txSentOn?: number;
  txSentId?: string;
}

export interface RampGetSellQuoteRequestData {
  env: RampSellEnv;
  cryptoAssetSymbol: string;
  fiatCurrency: string;
  /*
   * Although fiatValue and cryptoAmount are not both required, you need to pass one of them.
   * cryptoAmount - should be passed in token wei - e.g. for 1ETH cryptoAmount: 1000000000000000000
   * cryptoAmount?: string;
   * fiatValue?: number;
   */
  fiatValue?: number;
  cryptoAmount?: string;
}

export interface RampGetSellQuoteData {
  asset: RampAssetInfo;
  [RampPayoutMethodName.AMERICAN_BANK_TRANSFER]?: RampSellQuoteResultForPayoutMethod;
  [RampPayoutMethodName.AUTO_BANK_TRANSFER]?: RampSellQuoteResultForPayoutMethod;
  [RampPayoutMethodName.MANUAL_BANK_TRANSFER]?: RampSellQuoteResultForPayoutMethod;
  [RampPayoutMethodName.CARD]?: RampSellQuoteResultForPayoutMethod;
  [RampPayoutMethodName.CARD_PAYMENT]?: RampSellQuoteResultForPayoutMethod;
  [RampPayoutMethodName.SEPA]?: RampSellQuoteResultForPayoutMethod;
  [RampPayoutMethodName.SPEI]?: RampSellQuoteResultForPayoutMethod;
  errors?: any;
  error?: any;
  message?: any;
}

export enum RampPayoutMethodName {
  AMERICAN_BANK_TRANSFER = 'AMERICAN_BANK_TRANSFER',
  AUTO_BANK_TRANSFER = 'AUTO_BANK_TRANSFER',
  MANUAL_BANK_TRANSFER = 'MANUAL_BANK_TRANSFER',
  CARD = 'CARD',
  CARD_PAYMENT = 'CARD_PAYMENT',
  SEPA = 'SEPA',
  SPEI = 'SPEI',
}

export interface RampSellQuoteResultForPayoutMethod {
  appliedFee: number; // final fee the user pays (included in fiatValue), in fiatCurrency
  baseRampFee: number | null; // base Ramp Network fee before any modifications, in fiatCurrency
  cryptoAmount: string; // number-string, in wei or token units
  fiatCurrency: string; // three-letter currency code
  fiatValue: number; // total fiat value the user receives for the transaction, in fiatCurrency
  hostFeeCut?: number;
}

export interface RampSellPaymentRequestReqData {
  env: RampSellEnv;
  userCountry: string;
  referer_url: string;
  return_url: string;
  txn_details: {
    quote_id: string;
  };
}

export interface RampSellPaymentRequestData {
  app_sell_ref_id: string;
  txn_id: string;
  txn_url: string;
  errors?: any;
  error?: any;
  message?: any;
}

export interface RampGetSellTransactionDetailsRequestData {
  env: RampSellEnv;
  id: string;
  saleViewToken: string;
}

export type RampSellStatus = 'CREATED' | 'RELEASED' | 'EXPIRED';
export interface RampSellTransactionDetails {
  id: string;
  purchaseViewToken: string;
  createdAt: string;
  status: RampSellStatus;
  crypto: {
    amount: string;
    assetInfo: {
      address: string | null;
      symbol: string;
      chain: string;
      type: string;
      name: string;
      decimals: number;
    };
  };
  fiat: {
    amount: number;
    currencySymbol: string;
  };
}

export type RampSellEventType =
  | 'OFFRAMP_SALE_CREATED'
  | 'SEND_CRYPTO'
  | 'WIDGET_CONFIG_DONE';

export interface RampSellCreatedEventPayload {
  sale: {
    id: string;
    createdAt: string;
    updatedAt: string;
    crypto: {
      amount: string;
      status: string | null;
      assetInfo: {
        address: string | null;
        symbol: string;
        chain: string;
        type: string;
        name: string;
        decimals: number;
      };
    };
    fiat: {
      amount: string;
      currencySymbol: string;
      status: string;
      payoutMethod: RampPayoutMethodName;
    };
    fees: {
      amount: string;
      currencySymbol: string;
    };
    exchangeRate: string;
  };
  saleViewToken: string;
  apiUrl: string;
}

export interface RampSellSendCryptoPayload {
  assetInfo: {
    address: null | string;
    symbol: string;
    chain: string;
    type: string;
    name: string;
    decimals: number;
  };
  amount: string;
  address: string;
}

export interface RampOfframpSaleCreatedEvent {
  type: RampSellEventType;
  payload: null | RampSellCreatedEventPayload | RampSellSendCryptoPayload;
}
