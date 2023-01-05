import {
  SimplexPaymentData,
  SimplexIncomingData,
  WyrePaymentData,
  MoonpayPaymentData,
  MoonpayIncomingData,
} from './buy-crypto.models';

export enum BuyCryptoActionTypes {
  SUCCESS_PAYMENT_REQUEST_MOONPAY = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_MOONPAY',
  UPDATE_PAYMENT_REQUEST_MOONPAY = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_MOONPAY',
  REMOVE_PAYMENT_REQUEST_MOONPAY = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_MOONPAY',
  SUCCESS_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_SIMPLEX',
  UPDATE_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_SIMPLEX',
  REMOVE_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_SIMPLEX',
  SUCCESS_PAYMENT_REQUEST_WYRE = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_WYRE',
  REMOVE_PAYMENT_REQUEST_WYRE = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_WYRE',
}

interface successPaymentRequestMoonpay {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_MOONPAY;
  payload: {
    moonpayPaymentData: MoonpayPaymentData;
  };
}

interface updatePaymentRequestMoonpay {
  type: typeof BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_MOONPAY;
  payload: {
    moonpayIncomingData: MoonpayIncomingData;
  };
}

interface removePaymentRequestMoonpay {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_MOONPAY;
  payload: {
    externalId: string;
  };
}

interface successPaymentRequestSimplex {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SIMPLEX;
  payload: {
    simplexPaymentData: SimplexPaymentData;
  };
}

interface updatePaymentRequestSimplex {
  type: typeof BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SIMPLEX;
  payload: {
    simplexIncomingData: SimplexIncomingData;
  };
}

interface removePaymentRequestSimplex {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SIMPLEX;
  payload: {
    paymentId: string;
  };
}

interface successPaymentRequestWyre {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_WYRE;
  payload: {
    wyrePaymentData: WyrePaymentData;
  };
}

interface removePaymentRequestWyre {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_WYRE;
  payload: {
    orderId: string;
  };
}

export type BuyCryptoActionType =
  | successPaymentRequestMoonpay
  | updatePaymentRequestMoonpay
  | removePaymentRequestMoonpay
  | successPaymentRequestSimplex
  | updatePaymentRequestSimplex
  | removePaymentRequestSimplex
  | successPaymentRequestWyre
  | removePaymentRequestWyre;
