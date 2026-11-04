import {SwapCryptoActionType, SwapCryptoActionTypes} from './swap-crypto.types';
import {
  changellyTxData,
  moonpaySwapTxData,
  thorswapTxData,
} from './swap-crypto.models';

type SwapCryptoReduxPersistBlackList = string[];
export const swapCryptoReduxPersistBlackList: SwapCryptoReduxPersistBlackList =
  [];

export interface SwapCryptoState {
  changelly: {[key in string]: changellyTxData};
  thorswap: {[key in string]: thorswapTxData};
  moonpay: {[key in string]: moonpaySwapTxData};
}

const initialState: SwapCryptoState = {
  changelly: {},
  thorswap: {},
  moonpay: {},
};

export const swapCryptoReducer = (
  state: SwapCryptoState = initialState,
  action: SwapCryptoActionType,
): SwapCryptoState => {
  switch (action.type) {
    case SwapCryptoActionTypes.SUCCESS_TX_CHANGELLY:
      const {changellyTxData} = action.payload;
      return {
        ...state,
        changelly: {
          ...state.changelly,
          [changellyTxData.exchangeTxId]: changellyTxData,
        },
      };

    case SwapCryptoActionTypes.REMOVE_TX_CHANGELLY:
      const {exchangeTxId} = action.payload;
      const changellyTxList = {...state.changelly};
      delete changellyTxList[exchangeTxId];
      return {
        ...state,
        changelly: {...changellyTxList},
      };

    case SwapCryptoActionTypes.SUCCESS_TX_THORSWAP:
      const {thorswapTxData} = action.payload;
      return {
        ...state,
        thorswap: {
          ...state.thorswap,
          [thorswapTxData.orderId]: thorswapTxData,
        },
      };

    case SwapCryptoActionTypes.REMOVE_TX_THORSWAP:
      const {orderId} = action.payload;
      const thorswapTxList = {...state.thorswap};
      delete thorswapTxList[orderId];
      return {
        ...state,
        thorswap: {...thorswapTxList},
      };

    case SwapCryptoActionTypes.SUCCESS_TX_MOONPAY:
      const {moonpaySwapTxData} = action.payload;
      return {
        ...state,
        moonpay: {
          ...state.moonpay,
          [moonpaySwapTxData.txId]: moonpaySwapTxData,
        },
      };

    case SwapCryptoActionTypes.REMOVE_TX_MOONPAY:
      const {txId} = action.payload;
      const moonpayTxList = {...state.moonpay};
      delete moonpayTxList[txId];
      return {
        ...state,
        moonpay: {...moonpayTxList},
      };

    default:
      return state;
  }
};
