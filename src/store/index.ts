import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {AppState} from 'react-native';
import {
  Action,
  AnyAction,
  Store,
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
  Middleware,
} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import {createLogger} from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {createTransform, persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import {Selector} from 'reselect';
import {
  backupFileExists,
  backupPersistRoot,
  readBackupPersistRoot,
} from './backup/fs-backup';
import {
  bindWalletKeys,
  transformContacts,
  transformPortfolioPopulateStatus,
  encryptSpecificFields,
} from './transforms/transforms';
import {
  deserializeModernPersistValue,
  encryptPersistValue,
} from './transforms/encrypt';
import {createRehydrationFailureMiddleware} from './persistence-guard';
import {appReducer, appReduxPersistBlackList} from './app/app.reducer';
import {
  bitPayIdReducer,
  bitPayIdReduxPersistBlackList,
} from './bitpay-id/bitpay-id.reducer';
import {
  buyCryptoReducer,
  buyCryptoReduxPersistBlackList,
} from './buy-crypto/buy-crypto.reducer';
import {
  sellCryptoReducer,
  sellCryptoReduxPersistBlackList,
} from './sell-crypto/sell-crypto.reducer';
import {
  locationReducer,
  locationReduxPersistBlackList,
} from './location/location.reducer';
import {logReducer, logReduxPersistBlackList} from './log/log.reducer';
import {AddLog} from './log/log.types';
import {shopReducer, shopReduxPersistBlackList} from './shop/shop.reducer';
import {shopCatalogReducer} from './shop-catalog/shop-catalog.reducer';
import {
  swapCryptoReducer,
  swapCryptoReduxPersistBlackList,
} from './swap-crypto/swap-crypto.reducer';
import {
  ZenledgerReduxPersistBlackList,
  zenledgerReducer,
} from './zenledger/zenledger.reducer';
import {
  sumSubReducer,
  sumSubReduxPersistBlackList,
} from './sumsub/sumsub.reducer';
import {
  walletReducer,
  walletReduxPersistBlackList,
} from './wallet/wallet.reducer';
import {walletSecretsReducer} from './wallet-secrets/wallet-secrets.reducer';
import {
  contactReducer,
  ContactReduxPersistBlackList,
} from './contact/contact.reducer';
import {rateReducer, rateReduxPersistBlackList} from './rate/rate.reducer';
import {LogActions} from './log';
import * as initLogs from './log/initLogs';
import {
  walletConnectReducer,
  walletConnectV2Reducer,
  walletConnectV2ReduxPersistBlackList,
} from './wallet-connect-v2/wallet-connect-v2.reducer';
import {
  marketStatsReducer,
  marketStatsReduxPersistBlackList,
} from './market-stats/market-stats.reducer';
import {
  portfolioReducer,
  portfolioReduxPersistBlackList,
} from './portfolio/portfolio.reducer';
import {clearWalletPortfolioDataWithRuntime} from './portfolio';
import {WalletActionTypes} from './wallet/wallet.types';
import {invalidateWalletDerivedCachesForAction} from './wallet/utils/walletDerivedCacheLifecycle';
import {syncTestnetWalletsVisibility} from './wallet/utils/testnet';
import {BitPayIdActionTypes} from './bitpay-id/bitpay-id.types';
import {AppActionTypes} from './app/app.types';

import {Storage} from 'redux-persist';
import {
  pausePersistor,
  reportPersistWriteError,
  setActivePersistor,
} from './persistor';
import {rehydrateWalletSecrets} from './wallet-secrets/wallet-secrets.effects';
import {getErrorString} from '../utils/helper-methods';
import {AppDispatch} from '../utils/hooks';
import {logManager} from '../managers/LogManager';
import * as Sentry from '@sentry/react-native';
import {
  beginReduxAction,
  completeReduxAction,
  logPersistPhase,
  logPersistWrite,
  logReducerDuration,
} from './performanceDiagnostics';
import {PERF_DEBUG, performanceLog} from '../utils/performanceDebug';

import {modernStorage as storage, requireVaultActive} from './vault-storage';
import {prepareModernVault} from './vault-runtime';
import {unencryptedPersistStores} from './transforms/persist-encryption';
export {storage};

const FS_BACKUP_TRIGGER_ACTIONS = new Set<string>([
  WalletActionTypes.SUCCESS_CREATE_KEY,
  WalletActionTypes.SUCCESS_IMPORT,
  WalletActionTypes.SUCCESS_ADD_WALLET,
  WalletActionTypes.DELETE_KEY,
  WalletActionTypes.UPDATE_KEY_NAME,
  WalletActionTypes.UPDATE_WALLET_NAME,
  WalletActionTypes.UPDATE_ACCOUNT_NAME,
  WalletActionTypes.SYNC_WALLETS,
  WalletActionTypes.TOGGLE_HIDE_WALLET,
  WalletActionTypes.TOGGLE_HIDE_ACCOUNT,
  WalletActionTypes.SET_CUSTOM_TOKENS_MIGRATION_COMPLETE,
  WalletActionTypes.SET_POLYGON_MIGRATION_COMPLETE,
  WalletActionTypes.SET_ACCOUNT_EVM_CREATION_MIGRATION_COMPLETE,
  WalletActionTypes.SET_ACCOUNT_SVM_CREATION_MIGRATION_COMPLETE,
  WalletActionTypes.SET_SVM_ADDRESS_CREATION_FIX_COMPLETE,
  BitPayIdActionTypes.COMPLETED_PAIRING,
  BitPayIdActionTypes.BITPAY_ID_DISCONNECTED,
  AppActionTypes.PIN_LOCK_ACTIVE,
  AppActionTypes.BIOMETRIC_LOCK_ACTIVE,
]);

let backupTriggerAction: string | null = null;
let backupRetryLabel: string | null = null;
// Bounds retries and the missing-backup path: persist:root is written with
// throttle 0, so a broken filesystem would otherwise retry on every slice change
let backupFailures = 0;
let backupInFlight = false;
// Latest persist:root not yet handed to a backup; writes arriving while one is
// in flight coalesce here instead of queueing attempts past the failure limit
let pendingPersistRoot: string | null = null;

let storeDispatch: ((action: AnyAction) => void) | null = null;
// Never dispatches: every caller logs a storage failure, and ADD_PERSISTED_LOG
// mutates LOG state, which makes redux-persist write persist:root through the
// same storage that just failed
const addLog = (log: AddLog) => initLogs.add(log);

const restoreFromBackup = (reason: string): Promise<string | null> => {
  const startTs = Date.now();
  return readBackupPersistRoot()
    .then(restored => {
      if (restored) {
        try {
          // Write back to MMKV to repair store for future runs
          storage.set('persist:root', restored);
          logManager.info(
            `MMKV persist:root ${reason} - restored from filesystem backup - durationMs:${
              Date.now() - startTs
            }`,
          );
        } catch (err) {
          addLog(
            LogActions.persistLog(
              LogActions.error(
                `MMKV restore write-back failed - ${getErrorString(err)}`,
              ),
            ),
          );
          Sentry.captureException(err, {
            level: 'error',
          });
        }
        return restored;
      }
      return null;
    })
    .catch(() => null);
};

const removePortfolioChartsPersistRoot = (
  rawJson: string,
): {changed: boolean; value: string} => {
  if (!rawJson || !rawJson.includes('"PORTFOLIO_CHARTS"')) {
    return {changed: false, value: rawJson};
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (
      !Object.prototype.hasOwnProperty.call(parsed || {}, 'PORTFOLIO_CHARTS')
    ) {
      return {changed: false, value: rawJson};
    }

    delete parsed.PORTFOLIO_CHARTS;

    return {changed: true, value: JSON.stringify(parsed)};
  } catch (_) {
    return {changed: false, value: rawJson};
  }
};

const runFsBackup = async (): Promise<void> => {
  const value = pendingPersistRoot;
  if (backupInFlight || value === null) {
    return;
  }
  backupInFlight = true;
  pendingPersistRoot = null;
  let label = backupTriggerAction;
  backupTriggerAction = null;
  try {
    // A fresh trigger action always gets one attempt, as before retries existed
    if (!label && backupFailures < 3) {
      label =
        backupRetryLabel ??
        ((await backupFileExists()) ? null : 'no existing backup');
    }
    if (!label) {
      return;
    }
    try {
      await backupPersistRoot(value);
      backupFailures = 0;
      backupRetryLabel = null;
      logManager.debug(`Backed up store to filesystem, triggered by ${label}.`);
    } catch {
      // Retry on the next persist:root write rather than waiting for another
      // trigger action, which may never come
      backupFailures++;
      backupRetryLabel = label;
    }
  } finally {
    backupInFlight = false;
    if (pendingPersistRoot !== null) {
      runFsBackup();
    }
  }
};

export const reduxStorage: Storage = {
  setItem: async (key, value) => {
    requireVaultActive();
    const setItemStartedAt = PERF_DEBUG ? performance.now() : 0;
    const valueToStore =
      key === 'persist:root' && typeof value === 'string'
        ? removePortfolioChartsPersistRoot(value).value
        : value;

    let writeError: unknown;
    try {
      const mmkvStartedAt = PERF_DEBUG ? performance.now() : 0;
      storage.set(key, valueToStore);
      if (PERF_DEBUG) {
        logPersistWrite(
          performance.now() - mmkvStartedAt,
          typeof valueToStore === 'string' ? valueToStore.length : 0,
        );
      }
    } catch (err) {
      addLog(
        LogActions.persistLog(
          LogActions.error(
            `MMKV setItem failed - key:${key} len:${
              valueToStore?.length ?? 0
            } - ${getErrorString(err)}`,
          ),
        ),
      );
      Sentry.captureException(err, {
        level: 'error',
      });
      writeError = err;
    }
    try {
      if (key === 'persist:root' && typeof valueToStore === 'string') {
        pendingPersistRoot = valueToStore;
        runFsBackup();
      }
    } catch (_) {}
    if (PERF_DEBUG) {
      logPersistPhase(
        'setItem.total',
        performance.now() - setItemStartedAt,
        key,
      );
    }
    if (writeError !== undefined) {
      throw writeError;
    }
  },
  getItem: key => {
    requireVaultActive();
    try {
      const value = storage.getString(key);
      if (value == null && key === 'persist:root') {
        // Attempt restore from backup if MMKV has been wiped or is missing
        return restoreFromBackup('missing');
      }

      if (key === 'persist:root' && typeof value === 'string') {
        const sanitized = removePortfolioChartsPersistRoot(value);
        if (sanitized.changed) {
          try {
            storage.set(key, sanitized.value);
            logManager.info(
              `MMKV persist:root removed PORTFOLIO_CHARTS - beforeBytes:${value.length} afterBytes:${sanitized.value.length}`,
            );
          } catch (_) {}
        }
        return Promise.resolve(sanitized.value);
      }

      return Promise.resolve(value);
    } catch (err) {
      addLog(
        LogActions.persistLog(
          LogActions.error(
            `MMKV getItem failed - key:${key} - ${getErrorString(err)}`,
          ),
        ),
      );
      Sentry.captureException(err, {
        level: 'error',
      });
      if (key === 'persist:root') {
        // Try backup on MMKV get failure as well
        return restoreFromBackup('getItem error').then(restored => {
          if (restored === null) {
            throw err;
          }
          return restored;
        });
      }
      return Promise.resolve(null);
    }
  },
  removeItem: key => {
    requireVaultActive();
    try {
      storage.delete(key);
    } catch (err) {
      addLog(
        LogActions.persistLog(
          LogActions.error(
            `MMKV removeItem failed - key:${key} - ${getErrorString(err)}`,
          ),
        ),
      );
      Sentry.captureException(err, {
        level: 'error',
      });
    }
    return Promise.resolve();
  },
};

let activePersistor: {flush: () => Promise<void>} | null = null;
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;

const flushPersistenceSoon = () => {
  if (!activePersistor || pendingFlushTimer) {
    return;
  }
  // flush() dispatches FLUSH, and this runs inside a dispatch.
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = null;
    activePersistor?.flush().catch(() => {});
  }, 0);
};

let persistFlushSubscription: {remove: () => void} | null = null;

const registerPersistFlushOnBackground = (persistor: {
  flush: () => Promise<void>;
}) => {
  // getStore can run more than once, so replace any previous listener rather
  // than stacking them.
  persistFlushSubscription?.remove();
  persistFlushSubscription = AppState.addEventListener(
    'change',
    nextAppState => {
      if (nextAppState === 'background') {
        persistor.flush().catch(() => {});
      }
    },
  );
};

// Slices that no longer exist but can still be in state persisted by older
// app versions. Dropping them before the merge keeps combineReducers from
// warning about unexpected keys, and the next write leaves them out.
const REMOVED_PERSISTED_SLICES = ['CARD'];

const reconcilePersistedState: typeof autoMergeLevel2 = (
  inboundState,
  originalState,
  reducedState,
  config,
) => {
  const inbound = {...inboundState} as Record<string, unknown>;
  REMOVED_PERSISTED_SLICES.forEach(slice => delete inbound[slice]);
  return autoMergeLevel2(
    inbound as typeof inboundState,
    originalState,
    reducedState,
    config,
  );
};

const basePersistConfig = {
  storage: reduxStorage,
  stateReconciler: reconcilePersistedState,
  writeFailHandler: reportPersistWriteError,
};

const reducerPersistBlackLists: Record<keyof typeof reducers, string[]> = {
  APP: appReduxPersistBlackList,
  BITPAY_ID: bitPayIdReduxPersistBlackList,
  BUY_CRYPTO: buyCryptoReduxPersistBlackList,
  LOCATION: locationReduxPersistBlackList,
  LOG: logReduxPersistBlackList,
  SELL_CRYPTO: sellCryptoReduxPersistBlackList,
  SHOP: shopReduxPersistBlackList,
  SHOP_CATALOG: [],
  SWAP_CRYPTO: swapCryptoReduxPersistBlackList,
  WALLET: walletReduxPersistBlackList,
  WALLET_SECRETS: [],
  RATE: rateReduxPersistBlackList,
  CONTACT: ContactReduxPersistBlackList,
  ZENLEDGER: ZenledgerReduxPersistBlackList,
  WALLET_CONNECT: [],
  WALLET_CONNECT_V2: walletConnectV2ReduxPersistBlackList,
  MARKET_STATS: marketStatsReduxPersistBlackList,
  PORTFOLIO: portfolioReduxPersistBlackList,
  SUMSUB: sumSubReduxPersistBlackList,
};

/*
 * Create a rootReducer using combineReducers
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const reducers = {
  APP: appReducer,
  BITPAY_ID: bitPayIdReducer,
  BUY_CRYPTO: buyCryptoReducer,
  LOCATION: locationReducer,
  LOG: logReducer,
  SELL_CRYPTO: sellCryptoReducer,
  SHOP: shopReducer,
  SHOP_CATALOG: shopCatalogReducer,
  SWAP_CRYPTO: swapCryptoReducer,
  WALLET: walletReducer,
  WALLET_SECRETS: walletSecretsReducer,
  RATE: rateReducer,
  CONTACT: contactReducer,
  ZENLEDGER: zenledgerReducer,
  WALLET_CONNECT: walletConnectReducer,
  WALLET_CONNECT_V2: walletConnectV2Reducer,
  MARKET_STATS: marketStatsReducer,
  PORTFOLIO: portfolioReducer,
  SUMSUB: sumSubReducer,
};

const combinedReducer = combineReducers(reducers);

// Guarded root reducer that logs reducer crashes and returns previous state
type CombinedState = ReturnType<typeof combinedReducer>;

const rootReducer = (
  state: CombinedState | undefined,
  action: AnyAction,
): CombinedState => {
  const reducerStartedAt = PERF_DEBUG ? performance.now() : 0;
  try {
    const nextState = combinedReducer(state, action);
    if (PERF_DEBUG) {
      logReducerDuration(
        action?.type ?? 'UNKNOWN',
        performance.now() - reducerStartedAt,
      );
    }
    return nextState;
  } catch (err: any) {
    const crashLog = LogActions.persistLog(
      LogActions.error(
        `Reducer crash on action:${
          action?.type ?? 'UNKNOWN'
        } - ${getErrorString(err)}`,
      ),
    );
    setTimeout(() => addLog(crashLog), 0);
    Sentry.captureException(err, {
      level: 'error',
    });
    // Return previous state to avoid app crash; if no state, fallback to init
    if (state) {
      return state;
    }
    return combinedReducer(undefined, {type: '@@INIT'} as AnyAction);
  }
};

const logger = createLogger({
  predicate: (_getState, action) =>
    ![
      'LOG/ADD_LOG',
      'APP/SET_CURRENT_ROUTE',
      'persist/REHYDRATE',
      'persist/PERSIST',
    ].includes(action.type),
  stateTransformer: state => {
    return {
      ...state,
      WALLET: {
        ...state.WALLET,
        tokenOptions: null,
        balanceCacheKey: null,
      },
      SHOP: {
        ...state.SHOP,
        availableCardMap: null,
        integrations: null,
        supportedCardMap: null,
      },
      SHOP_CATALOG: {
        ...state.SHOP_CATALOG,
        availableCardMap: null,
        categoriesAndCurations: null,
        integrations: null,
        supportedCardMap: null,
      },
      BITPAY_ID: {
        ...state.BITPAY_ID,
        apiToken: null,
      },
    };
  },
});

const initializeStore = async () => {
  let rehydrationFailure: Error | null = null;
  const middlewares: Middleware[] = [thunkMiddleware as unknown as Middleware];

  middlewares.push(
    createRehydrationFailureMiddleware(error => {
      rehydrationFailure ??= error;
    }),
  );
  const reduxPerformanceMiddleware: Middleware =
    store => next => (action: AnyAction) => {
      if (!PERF_DEBUG || typeof action?.type !== 'string') {
        return next(action);
      }

      const actionType = action.type;
      const previousState = store.getState();
      const startedAt = performance.now();
      beginReduxAction(actionType);
      const result = next(action);
      const nextState = store.getState();
      const changedSlices = Object.keys(nextState).filter(
        key => previousState?.[key] !== nextState?.[key],
      );
      completeReduxAction(
        actionType,
        performance.now() - startedAt,
        changedSlices,
      );
      return result;
    };

  const cleanupPortfolioOnDeleteKeyMiddleware: Middleware = store => next => {
    return (action: AnyAction) => {
      if (action?.type !== WalletActionTypes.DELETE_KEY) {
        return next(action);
      }

      const keyId = action?.payload?.keyId;
      const walletIds = (() => {
        if (!keyId || typeof keyId !== 'string') {
          return [] as string[];
        }
        const key = store.getState()?.WALLET?.keys?.[keyId];
        const wallets = Array.isArray(key?.wallets) ? key.wallets : [];
        return wallets
          .map((w: any) => w?.id)
          .filter((id: any): id is string => typeof id === 'string' && !!id);
      })();

      const result = next(action);

      if (walletIds.length) {
        store.dispatch(clearWalletPortfolioDataWithRuntime({walletIds}) as any);
      }

      return result;
    };
  };

  const lastActionMiddleware =
    (): Middleware => () => next => (action: AnyAction) => {
      try {
        if (action && typeof action.type === 'string') {
          if (FS_BACKUP_TRIGGER_ACTIONS.has(action.type)) {
            backupTriggerAction = action.type;
            flushPersistenceSoon();
          }
        }
      } catch (_) {}
      return next(action);
    };

  const invalidateWalletDerivedCachesMiddleware: Middleware =
    () => next => (action: AnyAction) => {
      const result = next(action);
      invalidateWalletDerivedCachesForAction(action?.type);
      return result;
    };

  if (PERF_DEBUG) {
    middlewares.unshift(reduxPerformanceMiddleware);
  }
  middlewares.push(lastActionMiddleware());
  middlewares.push(invalidateWalletDerivedCachesMiddleware);
  middlewares.push(cleanupPortfolioOnDeleteKeyMiddleware);

  if (__DEV__ && !(DISABLE_DEVELOPMENT_LOGGING === 'true')) {
    // @ts-ignore
    // middlewares.push(logger);
  }
  if (__DEV__) {
    // uncomment this line to enable redux-immutable-state-invariant middleware
    // const inmmutableMiddleware =
    //   require('redux-immutable-state-invariant').default();
    // middlewares.push(inmmutableMiddleware);
  }

  const secretKey = await getEncryptionKey();

  const instrumentPersistTransform = (name: string, transform: any) => {
    if (!PERF_DEBUG) {
      return transform;
    }

    return {
      ...transform,
      in: (state: unknown, key: string, fullState: unknown) => {
        const startedAt = performance.now();
        const result = transform.in(state, key, fullState);
        logPersistPhase(`${name}.in`, performance.now() - startedAt, key);
        return result;
      },
      out: (state: unknown, key: string, fullState: unknown) => {
        const startedAt = performance.now();
        const result = transform.out(state, key, fullState);
        logPersistPhase(`${name}.out`, performance.now() - startedAt, key);
        return result;
      },
    };
  };

  const rootPersistConfig = {
    ...basePersistConfig,
    key: 'root',
    blacklist: ['LOG'],
    transforms: [
      instrumentPersistTransform('bindWalletKeys', bindWalletKeys),
      instrumentPersistTransform('transformContacts', transformContacts),
      instrumentPersistTransform(
        'transformPortfolioPopulateStatus',
        transformPortfolioPopulateStatus,
      ),
      instrumentPersistTransform(
        'persistBlacklist',
        createTransform<RootState, RootState, RootState>(
          (inboundState, key) => {
            // Clear out nested blacklisted fields before encrypting and persisting
            if (typeof key === 'string') {
              const reducerPersistBlackList =
                reducerPersistBlackLists[key as keyof typeof reducers];
              if (reducerPersistBlackList?.length) {
                const fieldOverrides = reducerPersistBlackList.reduce(
                  (all, field) => ({...all, [field]: undefined}),
                  {},
                );
                return {...inboundState, ...fieldOverrides};
              }
            }
            return inboundState;
          },
        ),
      ),
      instrumentPersistTransform(
        'encryptSpecificFields',
        encryptSpecificFields(secretKey),
      ),
      instrumentPersistTransform(
        'encryptTransform',
        createTransform<any, any, RootState>(
          (inboundState, key) => {
            if (typeof key === 'string' && unencryptedPersistStores.has(key)) {
              return JSON.stringify(inboundState);
            }

            return encryptPersistValue(
              inboundState,
              secretKey,
              `persist:${String(key)}`,
            );
          },
          (outboundState, key) => {
            try {
              return deserializeModernPersistValue(
                outboundState,
                secretKey,
                String(key),
                typeof key === 'string' && unencryptedPersistStores.has(key),
              );
            } catch (err) {
              pausePersistor(err);
              const errStr =
                err instanceof Error ? err.message : JSON.stringify(err);
              store.dispatch(
                LogActions.persistLog(
                  LogActions.error(
                    `Decrypt persist transform failed - ${errStr}`,
                  ),
                ),
              );
              Sentry.captureException(err, {
                level: 'error',
              });
              throw err;
            }
          },
        ),
      ),
    ],
  };

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
  // Persist lifecycle logging middleware
  const persistLifecycleLogger = (): Middleware => {
    let persistStartTs: number | null = null;
    let firstRehydrateLogged = false;
    return _store => next => (action: AnyAction) => {
      if (action.type === 'persist/REHYDRATE') {
        if (action.err) {
          pausePersistor(action.err);
        } else if (
          action.payload?.WALLET?.secretsMigrated &&
          !action.payload.WALLET_SECRETS
        ) {
          const error = new Error('Persisted wallet secrets are missing');
          rehydrationFailure ??= error;
          pausePersistor(error);
        }
      }
      if (PERF_DEBUG && action && typeof action.type === 'string') {
        if (action.type === 'persist/PERSIST') {
          persistStartTs = Date.now();
          try {
            const keysCount = storage.getAllKeys().length;
            performanceLog(
              `[PERF-PERSIST] phase:rehydrate.start storageKeys:${keysCount}`,
            );
          } catch (_) {}
        } else if (
          action.type === 'persist/REHYDRATE' &&
          !firstRehydrateLogged
        ) {
          firstRehydrateLogged = true;
          const took = persistStartTs ? Date.now() - persistStartTs : -1;
          try {
            const payload = action?.payload || {};
            const totalSize = (() => {
              try {
                return JSON.stringify(payload).length;
              } catch (_) {
                return -1;
              }
            })();
            const sizeByReduxKey: Record<string, number> = {};
            try {
              Object.keys(payload).forEach(k => {
                try {
                  sizeByReduxKey[k] = JSON.stringify(payload[k]).length;
                } catch (_) {}
              });
            } catch (_) {}
            performanceLog(
              `[PERF-PERSIST] phase:rehydrate.complete durationMs:${took} totalSize:${totalSize} sizeByReduxKey:${JSON.stringify(
                sizeByReduxKey,
              )}`,
            );
          } catch (_) {}
        }
      }
      return next(action);
    };
  };

  middlewares.push(persistLifecycleLogger());

  const middlewareEnhancers = __DEV__
    ? composeWithDevTools({trace: false})(applyMiddleware(...middlewares))
    : applyMiddleware(...middlewares);

  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  // Registered before the Provider subscribes, so list helpers see the new
  // testnet visibility by the time components re-render.
  store.subscribe(() =>
    syncTestnetWalletsVisibility(store.getState() as unknown as RootState),
  );
  // Enable direct log dispatching now that the store exists
  storeDispatch = store.dispatch;

  // Clear any stale logs, and immediately flush any initLogs that were added before the store was initialized
  storeDispatch(LogActions.clear());
  initLogs.drainAndDispatch(storeDispatch);

  let resolveBootstrap: () => void = () => {};
  const bootstrapped = new Promise<void>(resolve => {
    resolveBootstrap = resolve;
  });
  const persistor = persistStore(store, undefined, resolveBootstrap);
  setActivePersistor(persistor);

  await bootstrapped;
  if (rehydrationFailure) {
    persistor.pause();
    Sentry.captureException(rehydrationFailure, {level: 'error'});
    throw rehydrationFailure;
  }

  (store.dispatch as AppDispatch)(rehydrateWalletSecrets());
  activePersistor = persistor;
  registerPersistFlushOnBackground(persistor);

  if (__DEV__) {
    // persistor.purge().then(() => console.log('purged persistence'));
  }

  return {
    store,
    persistor,
  };
};

export type RootState = CombinedState;

export type AppSelector<T = any> = Selector<RootState, T>;

export type Effect<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

let storeInitialization: ReturnType<typeof initializeStore> | undefined;
const getStore = () => {
  storeInitialization ??= initializeStore().catch(error => {
    storeInitialization = undefined;
    throw error;
  });
  return storeInitialization;
};
export default getStore;

export function configureTestStore(initialState: any) {
  const middlewares = [thunkMiddleware];
  const middlewareEnhancers = composeWithDevTools({
    trace: true,
    traceLimit: 25,
  })(applyMiddleware(...middlewares));
  const store = createStore(rootReducer, initialState, middlewareEnhancers);
  syncTestnetWalletsVisibility(store.getState());
  store.subscribe(() => syncTestnetWalletsVisibility(store.getState()));
  return store as Store<RootState, AnyAction> & {
    dispatch: AppDispatch;
  };
}

export const getEncryptionKey = prepareModernVault;
