import {SwapCryptoActionType, SwapCryptoActionTypes} from './swap-crypto.types';
import {changellyTxData, thorswapTxData} from './swap-crypto.models';

type SwapCryptoReduxPersistBlackList = string[];
export const swapCryptoReduxPersistBlackList: SwapCryptoReduxPersistBlackList =
  [];

export interface SwapCryptoState {
  changelly: {[key in string]: changellyTxData};
  thorswap: {[key in string]: thorswapTxData};
}

const initialState: SwapCryptoState = {
  changelly: {},
  thorswap: {},
};

export const swapCryptoReducer = (
  state: SwapCryptoState = initialState,
  action: SwapCryptoActionType,
): SwapCryptoState => {
  switch (action.type) {
    case SwapCryptoActionTypes.SUCCESS_TX_CHANGELLY:
      const {changellyTxData: changellyTx} = action.payload;
      return {
        ...state,
        changelly: {
          ...state.changelly,
          [changellyTx.exchangeTxId]: changellyTx,
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
      const {thorswapTxData: thorswapTx} = action.payload;
      return {
        ...state,
        thorswap: {
          ...state.thorswap,
          [thorswapTx.orderId]: thorswapTx,
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

    default:
      return state;
  }
};
