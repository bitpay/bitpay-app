import {simplexPaymentData, wyrePaymentData} from './buy-crypto.models';
import {BuyCryptoActionType, BuyCryptoActionTypes} from './buy-crypto.types';
import {handleWyreStatus} from '../../navigation/services/buy-crypto/utils/wyre-utils';

type BuyCryptoReduxPersistBlackList = string[];
export const buyCryptoReduxPersistBlackList: BuyCryptoReduxPersistBlackList =
  [];

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

    case BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SIMPLEX:
      const {simplexIncomingData} = action.payload;

      if (
        simplexIncomingData.paymentId &&
        state.simplex[simplexIncomingData.paymentId]
      ) {
        state.simplex[simplexIncomingData.paymentId].status =
          simplexIncomingData.success === 'true' ? 'success' : 'failed';
        return {
          ...state,
          simplex: {
            ...state.simplex,
            [simplexIncomingData.paymentId]:
              state.simplex[simplexIncomingData.paymentId],
          },
        };
      } else {
        return state;
      }

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
      if (wyrePaymentData.orderId) {
        if (wyrePaymentData.status) {
          wyrePaymentData.status = handleWyreStatus(wyrePaymentData.status);
        }
        return {
          ...state,
          wyre: {...state.wyre, [wyrePaymentData.orderId]: wyrePaymentData},
        };
      } else {
        return state;
      }

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
