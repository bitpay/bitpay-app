import {SwapCryptoActionType, SwapCryptoActionTypes} from './swap-crypto.types';
import {changellyTxData} from './swap-crypto.models';

type SwapCryptoReduxPersistBlackList = string[];
export const swapCryptoReduxPersistBlackList: SwapCryptoReduxPersistBlackList =
  [];

export interface SwapCryptoState {
  changelly: {[key in string]: changellyTxData};
}

const initialState: SwapCryptoState = {
  changelly: {},
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

    default:
      return state;
  }
};
