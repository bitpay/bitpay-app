import {simplexPaymentData, wyrePaymentData} from './buy-crypto.models';
import {BuyCryptoActionType, BuyCryptoActionTypes} from './buy-crypto.types';

type BuyCryptoReduxPersistBlackList = string[];
export const buyCryptoReduxPersistBlackList: BuyCryptoReduxPersistBlackList = [
  'offers',
  'finishedSimplex',
  'finishedWyre',
  'updateView',
];

export interface BuyCryptoState {
  simplex: {[key in string]: simplexPaymentData};
  wyre: {[key in string]: wyrePaymentData};
}

const initialState: BuyCryptoState = {
  simplex: {},
  wyre: {},
};

export const buyCryptoReducer = (
  state: BuyCryptoState = initialState,
  action: BuyCryptoActionType,
): BuyCryptoState => {
  switch (action.type) {
    case BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SIMPLEX:
      const {simplexPaymentData} = action.payload;
      return {
        ...state,
        simplex: {
          ...state.simplex,
          [simplexPaymentData.payment_id]: simplexPaymentData,
        },
      };

    case BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SIMPLEX:
      const {paymentId} = action.payload;
      const simplexPaymentRequestsList = {...state.simplex};
      delete simplexPaymentRequestsList[paymentId];

      return {
        ...state,
        simplex: {...simplexPaymentRequestsList},
      };

    case BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_WYRE:
      const {wyrePaymentData} = action.payload;
      return {
        ...state,
        wyre: {...state.wyre, [wyrePaymentData.orderId]: wyrePaymentData},
      };

    case BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_WYRE:
      const {orderId} = action.payload;
      const wyrePaymentRequestsList = {...state.wyre};
      delete wyrePaymentRequestsList[orderId];

      return {
        ...state,
        wyre: {...wyrePaymentRequestsList},
      };

    default:
      return state;
  }
};
