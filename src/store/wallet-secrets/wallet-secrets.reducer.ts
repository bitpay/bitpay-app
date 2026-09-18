import {Key, KeyProperties, Wallet} from '../wallet/wallet.models';
import {WalletActionType, WalletActionTypes} from '../wallet/wallet.types';

export interface WalletCredentialSecrets {
  requestPrivKey?: string;
  walletPrivKey?: string;
  personalEncryptingKey?: string;
  sharedEncryptingKey?: string;
}

export interface WalletSecretsState {
  byKeyId: {[keyId: string]: KeyProperties};
  byWalletId: {[walletId: string]: WalletCredentialSecrets};
}

type WalletSecretsReduxPersistBlackList = (keyof WalletSecretsState)[];
export const walletSecretsReduxPersistBlackList: WalletSecretsReduxPersistBlackList =
  [];

export const initialWalletSecretsState: WalletSecretsState = {
  byKeyId: {},
  byWalletId: {},
};

export const credentialSecretFields: (keyof WalletCredentialSecrets)[] = [
  'requestPrivKey',
  'walletPrivKey',
  'personalEncryptingKey',
  'sharedEncryptingKey',
];

export const pickCredentialSecrets = (
  credentials: any,
): WalletCredentialSecrets =>
  credentialSecretFields.reduce((secrets, field) => {
    if (credentials?.[field]) {
      secrets[field] = credentials[field];
    }
    return secrets;
  }, {} as WalletCredentialSecrets);

const absorbKey = (state: WalletSecretsState, key: Key): WalletSecretsState => {
  const byWalletId = {...state.byWalletId};
  (key.wallets || []).forEach((wallet: Wallet) => {
    const secrets = pickCredentialSecrets((wallet as any).credentials);
    if (Object.keys(secrets).length) {
      byWalletId[wallet.id] = secrets;
    }
  });

  return {
    ...state,
    byKeyId: key.properties
      ? {...state.byKeyId, [key.id]: key.properties}
      : state.byKeyId,
    byWalletId,
  };
};

export const walletSecretsReducer = (
  state: WalletSecretsState = initialWalletSecretsState,
  action: WalletActionType,
): WalletSecretsState => {
  switch (action.type) {
    case WalletActionTypes.SUCCESS_CREATE_KEY:
    case WalletActionTypes.SUCCESS_ADD_WALLET:
    case WalletActionTypes.SUCCESS_UPDATE_KEY:
    case WalletActionTypes.SUCCESS_IMPORT:
      return absorbKey(state, action.payload.key);

    case WalletActionTypes.SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD: {
      const {key} = action.payload;
      return {
        ...state,
        byKeyId: {...state.byKeyId, [key.id]: key.methods!.toObj()},
      };
    }

    case WalletActionTypes.SYNC_WALLETS: {
      const {wallets} = action.payload;
      const byWalletId = {...state.byWalletId};
      (wallets || []).forEach((wallet: Wallet) => {
        const secrets = pickCredentialSecrets((wallet as any).credentials);
        if (Object.keys(secrets).length) {
          byWalletId[wallet.id] = secrets;
        }
      });
      return {...state, byWalletId};
    }

    case WalletActionTypes.SUCCESS_MIGRATE_WALLET_SECRETS: {
      const {byKeyId, byWalletId} = action.payload;
      return {
        ...state,
        byKeyId: {...state.byKeyId, ...byKeyId},
        byWalletId: {...state.byWalletId, ...byWalletId},
      };
    }

    case WalletActionTypes.DELETE_KEY: {
      const {keyId} = action.payload;
      const byKeyId = {...state.byKeyId};
      delete byKeyId[keyId];
      return {...state, byKeyId};
    }

    default:
      return state;
  }
};
