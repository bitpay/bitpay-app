import {
  Key,
  KeyProperties,
  PendingJoinerSession,
  TssSessionData,
  Wallet,
} from '../wallet/wallet.models';
import {WalletActionType, WalletActionTypes} from '../wallet/wallet.types';

export interface WalletCredentialSecrets {
  xPrivKey?: string;
  xPrivKeyEncrypted?: string;
  requestPrivKey?: string;
  walletPrivKey?: string;
  personalEncryptingKey?: string;
  sharedEncryptingKey?: string;
  mnemonic?: string;
  mnemonicEncrypted?: string;
  entropySource?: string;
}

export interface WalletSecretsState {
  byKeyId: {[keyId: string]: KeyProperties};
  byKeyIdAndWalletId: {
    [keyId: string]: {[walletId: string]: WalletCredentialSecrets};
  };
  tssSessionByKeyId: {[keyId: string]: TssSessionData};
  pendingJoinerSession: PendingJoinerSession | null;
}

export const initialWalletSecretsState: WalletSecretsState = {
  byKeyId: {},
  byKeyIdAndWalletId: {},
  tssSessionByKeyId: {},
  pendingJoinerSession: null,
};

export const credentialSecretFields: (keyof WalletCredentialSecrets)[] = [
  'xPrivKey',
  'xPrivKeyEncrypted',
  'requestPrivKey',
  'walletPrivKey',
  'personalEncryptingKey',
  'sharedEncryptingKey',
  'mnemonic',
  'mnemonicEncrypted',
  'entropySource',
];

export const pickCredentialSecrets = (
  credentials: any,
): WalletCredentialSecrets =>
  credentialSecretFields.reduce((secrets, field) => {
    if (credentials?.[field] !== undefined) {
      secrets[field] = credentials[field];
    }
    return secrets;
  }, {} as WalletCredentialSecrets);

const absorbKey = (state: WalletSecretsState, key: Key): WalletSecretsState => {
  const secretsForKey: {[walletId: string]: WalletCredentialSecrets} = {};

  (key.wallets || []).forEach((wallet: Wallet) => {
    const secrets = {
      ...state.byKeyIdAndWalletId?.[key.id]?.[wallet.id],
      ...pickCredentialSecrets((wallet as any).credentials),
    };
    if (Object.keys(secrets).length) {
      secretsForKey[wallet.id] = secrets;
    }
  });

  const tssSessionByKeyId = {...(state.tssSessionByKeyId || {})};
  if (key.tssSession) {
    tssSessionByKeyId[key.id] = key.tssSession;
  } else {
    delete tssSessionByKeyId[key.id];
  }

  return {
    ...state,
    byKeyId: key.properties
      ? {...state.byKeyId, [key.id]: key.properties}
      : state.byKeyId,
    byKeyIdAndWalletId: {
      ...(state.byKeyIdAndWalletId || {}),
      [key.id]: secretsForKey,
    },
    tssSessionByKeyId,
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
      const {keyId, wallets} = action.payload;
      const secretsForKey = {
        ...(state.byKeyIdAndWalletId?.[keyId] || {}),
      };
      (wallets || []).forEach((wallet: Wallet) => {
        const secrets = {
          ...state.byKeyIdAndWalletId?.[keyId]?.[wallet.id],
          ...pickCredentialSecrets((wallet as any).credentials),
        };
        if (Object.keys(secrets).length) {
          secretsForKey[wallet.id] = secrets;
        }
      });
      return {
        ...state,
        byKeyIdAndWalletId: {
          ...(state.byKeyIdAndWalletId || {}),
          [keyId]: secretsForKey,
        },
      };
    }

    case WalletActionTypes.SUCCESS_MIGRATE_WALLET_SECRETS:
      return {...state, ...action.payload};

    case WalletActionTypes.SET_PENDING_JOINER_SESSION:
      return {...state, pendingJoinerSession: action.payload ?? null};

    case WalletActionTypes.REMOVE_PENDING_JOINER_SESSION:
      return {...state, pendingJoinerSession: null};

    case WalletActionTypes.DELETE_KEY: {
      const {keyId} = action.payload;
      const byKeyId = {...state.byKeyId};
      const byKeyIdAndWalletId = {...(state.byKeyIdAndWalletId || {})};
      const tssSessionByKeyId = {...(state.tssSessionByKeyId || {})};
      delete byKeyId[keyId];
      delete byKeyIdAndWalletId[keyId];
      delete tssSessionByKeyId[keyId];
      return {
        ...state,
        byKeyId,
        byKeyIdAndWalletId,
        tssSessionByKeyId,
      };
    }

    default:
      return state;
  }
};
