import {changellyTxData} from './swap-crypto.models';

export enum SwapCryptoActionTypes {
  SUCCESS_TX_CHANGELLY = 'SWAP_CRYPTO/SUCCESS_TX_CHANGELLY',
  REMOVE_TX_CHANGELLY = 'SWAP_CRYPTO/REMOVE_TX_CHANGELLY',
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

export type SwapCryptoActionType = successTxChangelly | removeTxChangelly;
