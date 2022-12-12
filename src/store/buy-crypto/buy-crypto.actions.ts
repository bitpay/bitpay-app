import {BuyCryptoActionType, BuyCryptoActionTypes} from './buy-crypto.types';
import {
  MoonpayPaymentData,
  MoonpayIncomingData,
  SimplexPaymentData,
  SimplexIncomingData,
  WyrePaymentData,
} from './buy-crypto.models';

export const successPaymentRequestMoonpay = (payload: {
  moonpayPaymentData: MoonpayPaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_MOONPAY,
  payload,
});

export const updatePaymentRequestMoonpay = (payload: {
  moonpayIncomingData: MoonpayIncomingData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_MOONPAY,
  payload,
});

export const removePaymentRequestMoonpay = (payload: {
  externalId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_MOONPAY,
  payload,
});

export const successPaymentRequestSimplex = (payload: {
  simplexPaymentData: SimplexPaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SIMPLEX,
  payload,
});

export const updatePaymentRequestSimplex = (payload: {
  simplexIncomingData: SimplexIncomingData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SIMPLEX,
  payload,
});

export const removePaymentRequestSimplex = (payload: {
  paymentId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SIMPLEX,
  payload,
});

export const successPaymentRequestWyre = (payload: {
  wyrePaymentData: WyrePaymentData;
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
