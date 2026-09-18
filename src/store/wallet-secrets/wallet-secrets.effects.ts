import type {Effect} from '..';
import {logManager} from '../../managers/LogManager';
import {getErrorString} from '../../utils/helper-methods';
import {WalletActionTypes} from '../wallet/wallet.types';
import {bootstrapKey, bootstrapWallets} from '../transforms/transforms';
import {pickCredentialSecrets} from './wallet-secrets.reducer';
import {withCredentialSecrets} from './wallet-secrets.selectors';

export const migrateWalletSecrets =
  (flush: () => Promise<void>): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {WALLET} = getState();
    if (WALLET.secretsMigrated) {
      return;
    }

    try {
      const byKeyId: {[keyId: string]: any} = {};
      const byWalletId: {[walletId: string]: any} = {};

      Object.values(WALLET.keys || {}).forEach(key => {
        if (key.properties) {
          byKeyId[key.id] = key.properties;
        }
        (key.wallets || []).forEach(wallet => {
          const secrets = pickCredentialSecrets((wallet as any).credentials);
          if (Object.keys(secrets).length) {
            byWalletId[wallet.id] = secrets;
          }
        });
      });

      dispatch({
        type: WalletActionTypes.SUCCESS_MIGRATE_WALLET_SECRETS,
        payload: {byKeyId, byWalletId},
      } as any);

      await flush();

      dispatch({type: WalletActionTypes.SET_SECRETS_MIGRATED} as any);
      logManager.info(
        `wallet secrets migrated - keys:${
          Object.keys(byKeyId).length
        } wallets:${Object.keys(byWalletId).length}`,
      );
    } catch (err) {
      logManager.error(
        `wallet secrets migration failed - ${getErrorString(err)}`,
      );
    }
  };

export const rehydrateWalletSecrets =
  (): Effect<void> => (dispatch, getState) => {
    const {WALLET, WALLET_SECRETS} = getState();
    const keyIds = Object.keys(WALLET.keys || {});
    if (!keyIds.length) {
      return;
    }

    try {
      const keys = keyIds.reduce((rehydrated, keyId) => {
        const key = WALLET.keys[keyId];
        const properties = WALLET_SECRETS.byKeyId[keyId] || key.properties;
        if (!properties) {
          rehydrated[keyId] = key;
          return rehydrated;
        }

        const wallets = (key.wallets || []).map(wallet =>
          withCredentialSecrets(wallet, WALLET_SECRETS),
        );
        const withProperties = {...key, properties, wallets};
        rehydrated[keyId] =
          bootstrapKey(withProperties, keyId) || withProperties;
        rehydrated[keyId].wallets = bootstrapWallets(wallets);
        return rehydrated;
      }, {} as {[keyId: string]: any});

      dispatch({
        type: WalletActionTypes.SUCCESS_REHYDRATE_WALLET_SECRETS,
        payload: {keys},
      } as any);
    } catch (err) {
      logManager.error(
        `wallet secrets rehydrate failed - ${getErrorString(err)}`,
      );
    }
  };
