import {BuyCryptoActionType, BuyCryptoActionTypes} from './buy-crypto.types';
import {simplexPaymentData, wyrePaymentData} from './buy-crypto.models';

export const successPaymentRequestSimplex = (payload: {
  simplexPaymentData: simplexPaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SIMPLEX,
  payload,
});

export const removePaymentRequestSimplex = (payload: {
  paymentId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SIMPLEX,
  payload,
});

export const successPaymentRequestWyre = (payload: {
  wyrePaymentData: wyrePaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_WYRE,
  payload,
});

export const removePaymentRequestWyre = (payload: {
  orderId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_WYRE,
  payload,
});
