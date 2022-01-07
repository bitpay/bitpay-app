import {
  ExchangeRate,
  KeyMethods,
  KeyObj,
  PriceHistory,
  WalletObj,
} from './wallet.models';
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
  keyMethods: KeyMethods[];
  wallets: {[key in string]: WalletObj};
  rates: {[key in string]: Array<ExchangeRate>};
  priceHistory: Array<PriceHistory>;
}

const initialState: WalletState = {
  createdOn: Date.now(),
  keys: [],
  wallets: {},
  rates: {},
  priceHistory: [],
  keyMethods: [],
};

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletActionType,
): WalletState => {
  switch (action.type) {
    case WalletActionTypes.SUCCESS_CREATE_WALLET:
      const {key, wallet, keyMethods} = action.payload;
      return {
        ...state,
        keys: [...state.keys, key],
        keyMethods: [...state.keyMethods, keyMethods],
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
        rates: {...state.rates, ...rates},
      };

    case WalletActionTypes.SUCCESS_GET_PRICE_HISTORY:
      return {
        ...state,
        priceHistory: action.payload,
      };

    case WalletActionTypes.UPDATE_ASSET_BALANCE:
      const {keyId, assetId, balance} = action.payload;
      const walletToUpdate = state.wallets[keyId];
      if (walletToUpdate) {
        walletToUpdate.assets = walletToUpdate.assets.map(asset => {
          if (asset.walletId === assetId) {
            asset.balance = balance;
          }
          return asset;
        });
      }
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [keyId]: {
            ...walletToUpdate,
          },
        },
      };

    default:
      return state;
  }
};
