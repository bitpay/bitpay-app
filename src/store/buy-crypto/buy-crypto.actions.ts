import {BuyCryptoActionType, BuyCryptoActionTypes} from './buy-crypto.types';
import {
  BanxaPaymentData,
  BanxaIncomingData,
  MoonpayPaymentData,
  MoonpayIncomingData,
  SardinePaymentData,
  SardineIncomingData,
  SimplexPaymentData,
  SimplexIncomingData,
  TransakPaymentData,
  TransakIncomingData,
  WyrePaymentData,
} from './buy-crypto.models';
import {RampIncomingData, RampPaymentData} from './models/ramp.models';

export const successPaymentRequestBanxa = (payload: {
  banxaPaymentData: BanxaPaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_BANXA,
  payload,
});

export const updatePaymentRequestBanxa = (payload: {
  banxaIncomingData: BanxaIncomingData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_BANXA,
  payload,
});

export const removePaymentRequestBanxa = (payload: {
  banxaExternalId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_BANXA,
  payload,
});

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

export const successPaymentRequestRamp = (payload: {
  rampPaymentData: RampPaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_RAMP,
  payload,
});

export const updatePaymentRequestRamp = (payload: {
  rampIncomingData: RampIncomingData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_RAMP,
  payload,
});

export const removePaymentRequestRamp = (payload: {
  rampExternalId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_RAMP,
  payload,
});

export const successPaymentRequestSardine = (payload: {
  sardinePaymentData: SardinePaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SARDINE,
  payload,
});

export const updatePaymentRequestSardine = (payload: {
  sardineIncomingData: SardineIncomingData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE,
  payload,
});

export const removePaymentRequestSardine = (payload: {
  sardineExternalId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SARDINE,
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

export const successPaymentRequestTransak = (payload: {
  transakPaymentData: TransakPaymentData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_TRANSAK,
  payload,
});

export const updatePaymentRequestTransak = (payload: {
  transakIncomingData: TransakIncomingData;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK,
  payload,
});

export const removePaymentRequestTransak = (payload: {
  transakExternalId: string;
}): BuyCryptoActionType => ({
  type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_TRANSAK,
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
