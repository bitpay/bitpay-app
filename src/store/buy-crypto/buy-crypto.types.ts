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

export enum BuyCryptoActionTypes {
  SUCCESS_PAYMENT_REQUEST_BANXA = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_BANXA',
  UPDATE_PAYMENT_REQUEST_BANXA = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_BANXA',
  REMOVE_PAYMENT_REQUEST_BANXA = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_BANXA',
  SUCCESS_PAYMENT_REQUEST_MOONPAY = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_MOONPAY',
  UPDATE_PAYMENT_REQUEST_MOONPAY = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_MOONPAY',
  REMOVE_PAYMENT_REQUEST_MOONPAY = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_MOONPAY',
  SUCCESS_PAYMENT_REQUEST_RAMP = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_RAMP',
  UPDATE_PAYMENT_REQUEST_RAMP = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_RAMP',
  REMOVE_PAYMENT_REQUEST_RAMP = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_RAMP',
  SUCCESS_PAYMENT_REQUEST_SARDINE = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_SARDINE',
  UPDATE_PAYMENT_REQUEST_SARDINE = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_SARDINE',
  REMOVE_PAYMENT_REQUEST_SARDINE = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_SARDINE',
  SUCCESS_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_SIMPLEX',
  UPDATE_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_SIMPLEX',
  REMOVE_PAYMENT_REQUEST_SIMPLEX = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_SIMPLEX',
  SUCCESS_PAYMENT_REQUEST_TRANSAK = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_TRANSAK',
  UPDATE_PAYMENT_REQUEST_TRANSAK = 'BUY_CRYPTO/UPDATE_PAYMENT_REQUEST_TRANSAK',
  REMOVE_PAYMENT_REQUEST_TRANSAK = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_TRANSAK',
  SUCCESS_PAYMENT_REQUEST_WYRE = 'BUY_CRYPTO/SUCCESS_PAYMENT_REQUEST_WYRE',
  REMOVE_PAYMENT_REQUEST_WYRE = 'BUY_CRYPTO/REMOVE_PAYMENT_REQUEST_WYRE',
}

interface successPaymentRequestBanxa {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_BANXA;
  payload: {
    banxaPaymentData: BanxaPaymentData;
  };
}

interface updatePaymentRequestBanxa {
  type: typeof BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_BANXA;
  payload: {
    banxaIncomingData: BanxaIncomingData;
  };
}

interface removePaymentRequestBanxa {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_BANXA;
  payload: {
    banxaExternalId: string;
  };
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

interface successPaymentRequestRamp {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_RAMP;
  payload: {
    rampPaymentData: RampPaymentData;
  };
}

interface updatePaymentRequestRamp {
  type: typeof BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_RAMP;
  payload: {
    rampIncomingData: RampIncomingData;
  };
}

interface removePaymentRequestRamp {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_RAMP;
  payload: {
    rampExternalId: string;
  };
}

interface successPaymentRequestSardine {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SARDINE;
  payload: {
    sardinePaymentData: SardinePaymentData;
  };
}

interface updatePaymentRequestSardine {
  type: typeof BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE;
  payload: {
    sardineIncomingData: SardineIncomingData;
  };
}

interface removePaymentRequestSardine {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SARDINE;
  payload: {
    sardineExternalId: string;
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

interface successPaymentRequestTransak {
  type: typeof BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_TRANSAK;
  payload: {
    transakPaymentData: TransakPaymentData;
  };
}

interface updatePaymentRequestTransak {
  type: typeof BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK;
  payload: {
    transakIncomingData: TransakIncomingData;
  };
}

interface removePaymentRequestTransak {
  type: typeof BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_TRANSAK;
  payload: {
    transakExternalId: string;
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
  | successPaymentRequestBanxa
  | updatePaymentRequestBanxa
  | removePaymentRequestBanxa
  | successPaymentRequestMoonpay
  | updatePaymentRequestMoonpay
  | removePaymentRequestMoonpay
  | successPaymentRequestRamp
  | updatePaymentRequestRamp
  | removePaymentRequestRamp
  | successPaymentRequestSardine
  | updatePaymentRequestSardine
  | removePaymentRequestSardine
  | successPaymentRequestSimplex
  | updatePaymentRequestSimplex
  | removePaymentRequestSimplex
  | successPaymentRequestTransak
  | updatePaymentRequestTransak
  | removePaymentRequestTransak
  | successPaymentRequestWyre
  | removePaymentRequestWyre;
