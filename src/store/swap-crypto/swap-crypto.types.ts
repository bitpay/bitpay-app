import {
  changellyTxData,
  rangoTxData,
  thorswapTxData,
} from './swap-crypto.models';

export enum SwapCryptoActionTypes {
  SUCCESS_TX_CHANGELLY = 'SWAP_CRYPTO/SUCCESS_TX_CHANGELLY',
  REMOVE_TX_CHANGELLY = 'SWAP_CRYPTO/REMOVE_TX_CHANGELLY',
  SUCCESS_TX_RANGO = 'SWAP_CRYPTO/SUCCESS_TX_RANGO',
  REMOVE_TX_RANGO = 'SWAP_CRYPTO/REMOVE_TX_RANGO',
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

interface successTxRango {
  type: typeof SwapCryptoActionTypes.SUCCESS_TX_RANGO;
  payload: {
    rangoTxData: rangoTxData;
  };
}

interface removeTxRango {
  type: typeof SwapCryptoActionTypes.REMOVE_TX_RANGO;
  payload: {
    requestId: string;
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
  | successTxRango
  | removeTxRango
  | successTxThorswap
  | removeTxThorswap;
