import {ExchangeRate, Key, PriceHistory} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';

type WalletReduxPersistBlackList = [];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [];
import {ReceiveAddressConfig} from '../../navigation/wallet/components/ReceiveAddress';

export interface WalletState {
  createdOn: number;
  keys: {[key in string]: Key};
  rates: {[key in string]: Array<ExchangeRate>};
  priceHistory: Array<PriceHistory>;
  showReceiveAddressModal: boolean;
  receiveAddressConfig: ReceiveAddressConfig | undefined;
}

const initialState: WalletState = {
  createdOn: Date.now(),
  keys: {},
  rates: {},
  priceHistory: [],
  showReceiveAddressModal: false,
  receiveAddressConfig: undefined,
};

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletActionType,
): WalletState => {
  switch (action.type) {
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

    case WalletActionTypes.UPDATE_WALLET_BALANCE: {
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
      delete keyList[keyId];

      return {
        ...state,
        keys: {
          ...keyList,
        },
      };
    }

    case WalletActionTypes.SHOW_RECEIVE_ADDRESS_MODAL:
      return {
        ...state,
        showReceiveAddressModal: true,
        receiveAddressConfig: action.payload,
      };

    case WalletActionTypes.DISMISS_RECEIVE_ADDRESS_MODAL:
      return {
        ...state,
        showReceiveAddressModal: false,
        receiveAddressConfig: undefined,
      };

    default:
      return state;
  }
};
