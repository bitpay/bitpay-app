import {WithdrawalMethodKey} from '../../../navigation/services/sell-crypto/constants/SellCryptoConstants';

export type SimplexSellEnv = 'sandbox' | 'production';

export type SimplexPayoutMethodType = 'card' | 'sepa';

export type SimplexSellOrderStatus = 'bitpayTxSent' | 'bitpayFromCheckout';

export interface SimplexSellOrderData {
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
  payment_method: WithdrawalMethodKey; // bitpay-app payment method id
  external_id: string; // bitpay-app custom id
  status: SimplexSellOrderStatus;
  transaction_id?: string; // // id form simplex
  quote_id?: string; // quote id form simplex
  send_max?: boolean;
  tx_sent_on?: number;
  tx_sent_id?: string;
}

export interface SimplexSellIncomingData {
  simplexExternalId: string;
  transactionId?: string;
  status?: SimplexSellOrderStatus;
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

export interface SimplexGetSellQuoteRequestData {
  env: SimplexSellEnv;
  userCountry: string;
  base_currency: string;
  base_amount: number;
  quote_currency: string;
  pp_payment_method: SimplexPayoutMethodType;
}

export interface SimplexGetSellQuoteData {
  expiry_ts: number;
  fiat_amount: string;
  quote_id: string;
  rate: number;
  errors?: any;
  error?: any;
  message?: any;
}

export interface SimplexSellPaymentRequestReqData {
  env: SimplexSellEnv;
  userCountry: string;
  referer_url: string;
  return_url: string;
  txn_details: {
    quote_id: string;
  };
}

export interface SimplexSellPaymentRequestData {
  app_sell_ref_id: string;
  txn_id: string;
  txn_url: string;
  errors?: any;
  error?: any;
  message?: any;
}
