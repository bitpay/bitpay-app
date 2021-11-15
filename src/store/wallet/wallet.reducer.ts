import {WalletObj, KeyProfile} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';

type WalletReduxPersistBlackList = [];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [];

export interface WalletState {
  keyProfile: KeyProfile;
  wallets: Array<WalletObj>;
}

const initialState: WalletState = {
  keyProfile: {
    createdOn: Date.now(),
    keys: [],
  },
  wallets: [],
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
        keyProfile: {
          ...state.keyProfile,
          keys: [...state.keyProfile.keys, key],
        },
        wallets: [...state.wallets, wallet],
      };

    case WalletActionTypes.SET_BACKUP_COMPLETE:
      const idToUpdate = action.payload;
      return {
        ...state,
        wallets: state.wallets.map(_wallet =>
          _wallet.id === idToUpdate
            ? {..._wallet, backupComplete: true}
            : _wallet,
        ),
      };

    default:
      return state;
  }
};
