import {SwapCryptoActionType, SwapCryptoActionTypes} from './swap-crypto.types';
import {changellyTxData, thorswapTxData} from './swap-crypto.models';

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

export const successTxThorswap = (payload: {
  thorswapTxData: thorswapTxData;
}): SwapCryptoActionType => ({
  type: SwapCryptoActionTypes.SUCCESS_TX_THORSWAP,
  payload,
});

export const removeTxThorswap = (payload: {
  orderId: string;
}): SwapCryptoActionType => ({
  type: SwapCryptoActionTypes.REMOVE_TX_THORSWAP,
  payload,
});
