import {SwapCryptoActionType, SwapCryptoActionTypes} from './swap-crypto.types';
import {changellyTxData} from './swap-crypto.models';

export const successTxChangelly = (payload: {
  changellyTxData: changellyTxData;
}): SwapCryptoActionType => ({
  type: SwapCryptoActionTypes.SUCCESS_TX_CHANGELLY,
  payload,
});

export const removeTxChangelly = (payload: {
  exchangeTxId: string;
}): SwapCryptoActionType => ({
  type: SwapCryptoActionTypes.REMOVE_TX_CHANGELLY,
  payload,
});
