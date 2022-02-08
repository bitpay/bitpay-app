import {ExchangeRate, Key, PriceHistory, Token} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';
import merge from 'lodash.merge';

type WalletReduxPersistBlackList = [];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [];

export interface WalletState {
  createdOn: number;
  keys: {[key in string]: Key};
  rates: {[key in string]: Array<ExchangeRate>};
  priceHistory: Array<PriceHistory>;
  tokenOptions: {[key in string]: Token};
  walletTermsAccepted: boolean;
  portfolioBalance: {
    current: number;
    previous: number;
  };
  balanceCacheKey: {[key in string]: number | undefined};
}

const initialState: WalletState = {
  createdOn: Date.now(),
  keys: {},
  rates: {},
  priceHistory: [],
  tokenOptions: {},
  walletTermsAccepted: false,
  portfolioBalance: {
    current: 0,
    previous: 0,
  },
  balanceCacheKey: {},
};

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletActionType,
): WalletState => {
  switch (action.type) {
    case WalletActionTypes.SUCCESS_ADD_WALLET:
    case WalletActionTypes.SUCCESS_CREATE_KEY:
    case WalletActionTypes.SUCCESS_IMPORT: {
      const {key} = action.payload;
      return {
        ...state,
        keys: {...state.keys, [key.id]: key},
      };
    }

    case WalletActionTypes.SET_BACKUP_COMPLETE: {
      const id = action.payload;
      const updatedKey = {...state.keys[id], backupComplete: true};

      return {
        ...state,
        keys: {...state.keys, [id]: updatedKey},
      };
    }

    case WalletActionTypes.SUCCESS_GET_RATES: {
      const {rates} = action.payload;

      return {
        ...state,
        rates: {...state.rates, ...rates},
      };
    }

    case WalletActionTypes.SUCCESS_GET_PRICE_HISTORY: {
      return {
        ...state,
        priceHistory: action.payload,
      };
    }

    case WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCE: {
      const {keyId, walletId, balance} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (keyToUpdate) {
        keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
          if (wallet.id === walletId) {
            wallet.balance = balance;
          }
          return wallet;
        });
      }
      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
        balanceCacheKey: {
          ...state.balanceCacheKey,
          [walletId]: Date.now(),
        },
      };
    }

    case WalletActionTypes.SUCCESS_UPDATE_KEY_TOTAL_BALANCE: {
      const {keyId, totalBalance} = action.payload;
      const keyToUpdate = state.keys[keyId];
      keyToUpdate.totalBalance = totalBalance;
      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
        balanceCacheKey: {
          ...state.balanceCacheKey,
          [keyId]: Date.now(),
        },
      };
    }

    case WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_BALANCES: {
      return {
        ...state,
        balanceCacheKey: {
          ...state.balanceCacheKey,
          all: Date.now(),
        },
      };
    }

    case WalletActionTypes.UPDATE_PORTFOLIO_BALANCE: {
      let current = 0;
      Object.values(state.keys).forEach(key => (current += key.totalBalance));
      return {
        ...state,
        portfolioBalance: {
          current,
          previous: 0,
        },
      };
    }

    case WalletActionTypes.SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD: {
      const {key} = action.payload;
      const keyToUpdate = state.keys[key.id];
      keyToUpdate.isPrivKeyEncrypted = !!key.methods.isPrivKeyEncrypted();

      return {
        ...state,
        keys: {
          ...state.keys,
          [key.id]: {
            ...keyToUpdate,
            properties: key.methods.toObj(),
          },
        },
      };
    }

    case WalletActionTypes.DELETE_KEY: {
      const {keyId} = action.payload;
      const keyList = {...state.keys};
      const balanceToRemove = state.keys[keyId].totalBalance;
      delete keyList[keyId];

      return {
        ...state,
        keys: {
          ...keyList,
        },
        portfolioBalance: {
          current: state.portfolioBalance.current - balanceToRemove,
          previous: 0,
        },
      };
    }

    case WalletActionTypes.SUCCESS_GET_TOKEN_OPTIONS: {
      return {
        ...state,
        tokenOptions: action.payload,
      };
    }

    case WalletActionTypes.SET_WALLET_TERMS_ACCEPTED: {
      return {
        ...state,
        walletTermsAccepted: true,
      };
    }

    case WalletActionTypes.TOGGLE_HOME_KEY_CARD: {
      const {keyId, show} = action.payload;
      const keyToUpdate = state.keys[keyId];
      keyToUpdate.show = show;

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.SUCCESS_GET_RECEIVE_ADDRESS: {
      const {keyId, id} = action.payload.wallet;
      const keyList = {...state.keys};
      const keyToUpdate = keyList[keyId];
      keyList[keyId].wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === id) {
          return merge(wallet, action.payload.wallet);
        }
        return wallet;
      });

      return {
        ...state,
        keys: {...state.keys, ...keyList},
      };
    }

    default:
      return state;
  }
};
