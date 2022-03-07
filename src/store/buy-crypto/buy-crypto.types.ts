import {simplexPaymentData, wyrePaymentData} from './buy-crypto.models';

export enum BuyCryptoActionTypes {
  SUCCESS_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_SIMPLEX',
  REMOVE_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_SIMPLEX',
  SUCCESS_PAYMENT_REQUEST_WYRE = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_WYRE',
  REMOVE_PAYMENT_REQUEST_WYRE = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_WYRE',
}

interface successPaymentRequestSimplex {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SIMPLEX;
  payload: {
    simplexPaymentData: simplexPaymentData;
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
    wyrePaymentData: wyrePaymentData;
  };
}

interface removePaymentRequestWyre {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_WYRE;
  payload: {
    orderId: string;
  };
}

export type BuyCryptoActionType =
  | successPaymentRequestSimplex
  | removePaymentRequestSimplex
  | successPaymentRequestWyre
  | removePaymentRequestWyre;
