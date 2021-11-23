import {ExchangeRate, KeyObj, WalletObj} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';

type WalletReduxPersistBlackList = [];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [];

/*
 * NOTE - Structure change

 wallet: {
      id: key.id,
      assets: credentials,
    }

 example -
 wallets: [key.id]: {
      id: key.id,
      assets: [
       {
        coin: 'btc'
       },
       {
        coin: 'eth',
        tokens: ...tokens
        ....
       }
      ],
    }
 * */

export interface WalletState {
  createdOn: number;
  keys: KeyObj[];
  wallets: {[key in string]: WalletObj};
  rates: Array<ExchangeRate>;
}

const initialState: WalletState = {
  createdOn: Date.now(),
  keys: [],
  wallets: {},
  rates: [],
};

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletActionType,
): WalletState => {
  switch (action.type) {
    case WalletActionTypes.SUCCESS_CREATE_WALLET:
      const {key, wallet} = action.payload;
      return {
        ...state,
        keys: [...state.keys, key],
        wallets: {...state.wallets, [key.id]: wallet},
      };

    case WalletActionTypes.SET_BACKUP_COMPLETE:
      const id = action.payload;
      const updatedWallet = {...state.wallets[id], backupComplete: true};

      return {
        ...state,
        wallets: {...state.wallets, [id]: updatedWallet},
      };

    case WalletActionTypes.SUCCESS_GET_RATES:
      const {rates} = action.payload;

      return {
        ...state,
        rates: [...state.rates, rates],
      };

    default:
      return state;
  }
};
