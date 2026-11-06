import type {Effect} from '..';
import {logManager} from '../../managers/LogManager';
import {getErrorString} from '../../utils/helper-methods';
import {Key, KeyProperties, Wallet} from '../wallet/wallet.models';
import {WalletActionTypes} from '../wallet/wallet.types';
import {bootstrapKey, bootstrapWallets} from '../transforms/transforms';
import {
  initialWalletSecretsState,
  pickCredentialSecrets,
  WalletCredentialSecrets,
  WalletSecretsState,
} from './wallet-secrets.reducer';

const withCredentialSecrets = (
  wallet: Wallet,
  secrets: WalletSecretsState,
  keyId: string,
): Wallet => {
  const walletSecrets = secrets.byKeyIdAndWalletId?.[keyId]?.[wallet.id];
  if (!walletSecrets) {
    return wallet;
  }
  return {
    ...wallet,
    credentials: {...wallet.credentials, ...walletSecrets},
  } as Wallet;
};

const withTssSessionSecrets = (key: Key, secrets: WalletSecretsState): Key => {
  const sessionSecrets = secrets.tssSessionByKeyId?.[key.id];
  return sessionSecrets ? {...key, tssSession: sessionSecrets} : key;
};

export const migrateWalletSecrets =
  (
    flush: () => Promise<void>,
    removeBackups: () => Promise<void>,
    resumeBackups: (discardDeferred?: boolean) => Promise<void>,
  ): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {WALLET, WALLET_SECRETS} = getState();
    if (WALLET.secretsMigrated) {
      return;
    }

    let backupsSuspended = false;
    let migrationMarked = false;
    try {
      const existingSecrets = {
        ...initialWalletSecretsState,
        ...(WALLET_SECRETS || {}),
      };
      const byKeyId: {[keyId: string]: KeyProperties} = {};
      const byKeyIdAndWalletId: {
        [keyId: string]: {[walletId: string]: WalletCredentialSecrets};
      } = {};
      const tssSessionByKeyId: {[keyId: string]: any} = {};

      Object.values(WALLET.keys || {}).forEach(key => {
        const properties = key.properties || existingSecrets.byKeyId[key.id];
        if (properties) {
          byKeyId[key.id] = properties;
        }
        const walletSecretsForKey: {
          [walletId: string]: WalletCredentialSecrets;
        } = {};
        (key.wallets || []).forEach(wallet => {
          const secrets = {
            ...existingSecrets.byKeyIdAndWalletId?.[key.id]?.[wallet.id],
            ...pickCredentialSecrets((wallet as any).credentials),
          };
          if (Object.keys(secrets).length) {
            walletSecretsForKey[wallet.id] = secrets;
          }
        });
        byKeyIdAndWalletId[key.id] = walletSecretsForKey;
        const tssSessionSecrets =
          key.tssSession || existingSecrets.tssSessionByKeyId?.[key.id];
        if (tssSessionSecrets) {
          tssSessionByKeyId[key.id] = tssSessionSecrets;
        }
      });

      dispatch({
        type: WalletActionTypes.SUCCESS_MIGRATE_WALLET_SECRETS,
        payload: {
          byKeyId,
          byKeyIdAndWalletId,
          tssSessionByKeyId,
          pendingJoinerSession:
            WALLET.pendingJoinerSession ||
            existingSecrets.pendingJoinerSession ||
            null,
        },
      } as any);

      await flush();

      backupsSuspended = true;
      await removeBackups();

      dispatch({
        type: WalletActionTypes.SET_SECRETS_MIGRATED,
        payload: true,
      } as any);
      migrationMarked = true;
      await flush();
      await resumeBackups();
      backupsSuspended = false;
      logManager.info(
        `wallet secrets migrated - keys:${
          Object.keys(byKeyId).length
        } wallets:${Object.values(byKeyIdAndWalletId).reduce(
          (count, wallets) => count + Object.keys(wallets).length,
          0,
        )}`,
      );
    } catch (err) {
      if (migrationMarked) {
        dispatch({
          type: WalletActionTypes.SET_SECRETS_MIGRATED,
          payload: false,
        } as any);
        try {
          await flush();
        } catch (rollbackError) {
          logManager.error(
            `wallet secrets migration rollback failed - ${getErrorString(
              rollbackError,
            )}`,
          );
        }
      }
      if (backupsSuspended) {
        try {
          await resumeBackups(true);
        } catch (resumeError) {
          logManager.error(
            `wallet backup resume failed - ${getErrorString(resumeError)}`,
          );
        }
      }
      logManager.error(
        `wallet secrets migration failed - ${getErrorString(err)}`,
      );
    }
  };

export const rehydrateWalletSecrets =
  (): Effect<void> => (dispatch, getState) => {
    const {WALLET, WALLET_SECRETS} = getState();
    if (!WALLET.secretsMigrated) {
      return;
    }

    const secrets = {
      ...initialWalletSecretsState,
      ...(WALLET_SECRETS || {}),
    };
    const keyIds = Object.keys(WALLET.keys || {});
    if (!keyIds.length && !secrets.pendingJoinerSession) {
      return;
    }

    try {
      const keys = keyIds.reduce((rehydrated, keyId) => {
        const key = WALLET.keys[keyId];
        const properties = secrets.byKeyId[keyId] || key.properties;

        const wallets = (key.wallets || []).map(wallet =>
          withCredentialSecrets(wallet, secrets, keyId),
        );
        const withSecrets = withTssSessionSecrets(
          properties ? {...key, properties, wallets} : {...key, wallets},
          secrets,
        );
        rehydrated[keyId] = properties
          ? bootstrapKey(withSecrets, keyId) || withSecrets
          : withSecrets;
        rehydrated[keyId].wallets = bootstrapWallets(wallets);
        return rehydrated;
      }, {} as {[keyId: string]: any});

      dispatch({
        type: WalletActionTypes.SUCCESS_REHYDRATE_WALLET_SECRETS,
        payload: {keys, pendingJoinerSession: secrets.pendingJoinerSession},
      } as any);
    } catch (err) {
      logManager.error(
        `wallet secrets rehydrate failed - ${getErrorString(err)}`,
      );
    }
  };

// RN-3086 / IS-1572: TSS keys completed before ceremony secrets were dropped on
// completion still carry tssSession.password (the spending password that encrypts the
// key) and a duplicate partyKey. Scrub them once at startup; idempotent, and a no-op
// once nothing is left to remove.
export const scrubCompletedTssSessionSecrets =
  (): Effect<void> => (dispatch, getState) => {
    const sessions = getState().WALLET_SECRETS?.tssSessionByKeyId || {};
    const keyIds = Object.keys(sessions).filter(keyId => {
      const session = sessions[keyId];
      return (
        session?.status === 'complete' &&
        (session.password !== undefined || session.partyKey !== undefined)
      );
    });
    if (keyIds.length) {
      logManager.info(
        `[TSS] Clearing ceremony secrets from ${keyIds.length} completed session(s)`,
      );
      dispatch({
        type: WalletActionTypes.CLEAR_TSS_SESSION_SECRETS,
        payload: {keyIds},
      });
    }
  };
