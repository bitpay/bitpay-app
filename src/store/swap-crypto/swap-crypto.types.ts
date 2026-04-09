import {changellyTxData, thorswapTxData} from './swap-crypto.models';

export enum SwapCryptoActionTypes {
  SUCCESS_TX_CHANGELLY = 'SWAP_CRYPTO/SUCCESS_TX_CHANGELLY',
  REMOVE_TX_CHANGELLY = 'SWAP_CRYPTO/REMOVE_TX_CHANGELLY',
  SUCCESS_TX_THORSWAP = 'SWAP_CRYPTO/SUCCESS_TX_THORSWAP',
  REMOVE_TX_THORSWAP = 'SWAP_CRYPTO/REMOVE_TX_THORSWAP',
}

interface successTxChangelly {
  type: typeof SwapCryptoActionTypes.SUCCESS_TX_CHANGELLY;
  payload: {
    changellyTxData: changellyTxData;
  };
}

interface removeTxChangelly {
  type: typeof SwapCryptoActionTypes.REMOVE_TX_CHANGELLY;
  payload: {
    exchangeTxId: string;
  };
}

interface successTxThorswap {
  type: typeof SwapCryptoActionTypes.SUCCESS_TX_THORSWAP;
  payload: {
    thorswapTxData: thorswapTxData;
  };
}

interface removeTxThorswap {
  type: typeof SwapCryptoActionTypes.REMOVE_TX_THORSWAP;
  payload: {
    orderId: string;
  };
}

export type SwapCryptoActionType =
  | successTxChangelly
  | removeTxChangelly
  | successTxThorswap
  | removeTxThorswap;
