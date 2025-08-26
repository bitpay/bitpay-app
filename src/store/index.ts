import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {
  Action,
  AnyAction,
  Store,
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
  Middleware,
  StoreEnhancer,
} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import {createLogger} from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {getUniqueId} from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';
import {createTransform, persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import {encryptTransform} from 'redux-persist-transform-encrypt'; // https://github.com/maxdeviant/redux-persist-transform-encrypt
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import {Selector} from 'reselect';
import {
  bindWalletKeys,
  transformContacts,
  encryptSpecificFields,
} from './transforms/transforms';
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
import {cardReducer, cardReduxPersistBlacklist} from './card/card.reducer';
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
  walletReducer,
  walletReduxPersistBlackList,
} from './wallet/wallet.reducer';
import {
  contactReducer,
  ContactReduxPersistBlackList,
} from './contact/contact.reducer';
import {
  coinbaseReducer,
  CoinbaseReduxPersistBlackList,
} from './coinbase/coinbase.reducer';
import {rateReducer, rateReduxPersistBlackList} from './rate/rate.reducer';
import {LogActions} from './log';
import * as initLogs from './log/initLogs';
import {
  walletConnectReducer,
  walletConnectV2Reducer,
  walletConnectV2ReduxPersistBlackList,
} from './wallet-connect-v2/wallet-connect-v2.reducer';

import {Storage} from 'redux-persist';
import {MMKV} from 'react-native-mmkv';
import {getErrorString} from '../utils/helper-methods';
import {AppDispatch} from '../utils/hooks';
import {
  ZenledgerReduxPersistBlackList,
  zenledgerReducer,
} from './zenledger/zenledger.reducer';

export const storage = new MMKV();

// Module-scoped logger that safely logs before and after store initialization
let storeDispatch: ((action: AnyAction) => void) | null = null;
const addLog = (log: AddLog) => {
  try {
    if (storeDispatch) {
      storeDispatch(log);
    } else {
      // Fallback to initLogs buffer until store is ready
      initLogs.add(log);
    }
  } catch (_) {}
};

export const reduxStorage: Storage = {
  setItem: (key, value) => {
    try {
      storage.set(key, value);
    } catch (err) {
      addLog(
        LogActions.persistLog(
          LogActions.error(
            `MMKV setItem failed - key:${key} len:${
              value?.length ?? 0
            } - ${getErrorString(err)}`,
          ),
        ),
      );
    }
    return Promise.resolve();
  },
  getItem: key => {
    try {
      const value = storage.getString(key);
      return Promise.resolve(value);
    } catch (err) {
      addLog(
        LogActions.persistLog(
          LogActions.error(
            `MMKV getItem failed - key:${key} - ${getErrorString(err)}`,
          ),
        ),
      );
      return Promise.resolve(null);
    }
  },
  removeItem: key => {
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
    }
    return Promise.resolve();
  },
};

const basePersistConfig = {
  storage: reduxStorage,
  stateReconciler: autoMergeLevel2,
};

const reducerPersistBlackLists: Record<keyof typeof reducers, string[]> = {
  APP: appReduxPersistBlackList,
  BITPAY_ID: bitPayIdReduxPersistBlackList,
  BUY_CRYPTO: buyCryptoReduxPersistBlackList,
  CARD: cardReduxPersistBlacklist,
  LOCATION: locationReduxPersistBlackList,
  LOG: logReduxPersistBlackList,
  SELL_CRYPTO: sellCryptoReduxPersistBlackList,
  SHOP: shopReduxPersistBlackList,
  SHOP_CATALOG: [],
  SWAP_CRYPTO: swapCryptoReduxPersistBlackList,
  WALLET: walletReduxPersistBlackList,
  RATE: rateReduxPersistBlackList,
  CONTACT: ContactReduxPersistBlackList,
  COINBASE: CoinbaseReduxPersistBlackList,
  ZENLEDGER: ZenledgerReduxPersistBlackList,
  WALLET_CONNECT: [],
  WALLET_CONNECT_V2: walletConnectV2ReduxPersistBlackList,
};

/*
 * Create a rootReducer using combineReducers
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const reducers = {
  APP: appReducer,
  BITPAY_ID: bitPayIdReducer,
  BUY_CRYPTO: buyCryptoReducer,
  CARD: cardReducer,
  LOCATION: locationReducer,
  LOG: logReducer,
  SELL_CRYPTO: sellCryptoReducer,
  SHOP: shopReducer,
  SHOP_CATALOG: shopCatalogReducer,
  SWAP_CRYPTO: swapCryptoReducer,
  WALLET: walletReducer,
  RATE: rateReducer,
  CONTACT: contactReducer,
  COINBASE: coinbaseReducer,
  ZENLEDGER: zenledgerReducer,
  WALLET_CONNECT: walletConnectReducer,
  WALLET_CONNECT_V2: walletConnectV2Reducer,
};

const combinedReducer = combineReducers(reducers);

// Guarded root reducer that logs reducer crashes and returns previous state
const rootReducer = (state: any, action: AnyAction) => {
  try {
    return combinedReducer(state, action);
  } catch (err: any) {
    const crashLog = LogActions.persistLog(
      LogActions.error(
        `Reducer crash on action:${
          action?.type ?? 'UNKNOWN'
        } - ${getErrorString(err)}`,
      ),
    );
    setTimeout(() => addLog(crashLog), 0);
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
        doshToken: null,
        apiToken: null,
      },
    };
  },
});

const getStore = async () => {
  const middlewares: Middleware[] = [
    thunkMiddleware as unknown as Middleware,
  ];

  if (__DEV__ && !(DISABLE_DEVELOPMENT_LOGGING === 'true')) {
    // @ts-ignore
    middlewares.push(logger);
  }
  if (__DEV__) {
    // uncomment this line to enable redux-immutable-state-invariant middleware
    // const inmmutableMiddleware =
    //   require('redux-immutable-state-invariant').default();
    // middlewares.push(inmmutableMiddleware);
  }

  const secretKey = await getEncryptionKey().catch(() => getUniqueId());

  const rootPersistConfig = {
    ...basePersistConfig,
    key: 'root',
    transforms: [
      bindWalletKeys,
      transformContacts,
      createTransform<RootState, RootState, RootState>((inboundState, key) => {
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
      }),
      encryptSpecificFields(secretKey),
      encryptTransform({
        secretKey,
        onError: err => {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);

          store.dispatch(
            LogActions.persistLog(
              LogActions.error(`Encrypt transform failed - ${errStr}`),
            ),
          );
        },
        unencryptedStores: ['APP', 'RATE', 'SHOP', 'SHOP_CATALOG', 'WALLET'],
      }),
    ],
  };

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
  // Persist lifecycle logging middleware
  const persistLifecycleLogger = (): Middleware => {
    let persistStartTs: number | null = null;
    let firstRehydrateLogged = false;
    return store => next => (action: AnyAction) => {
      if (action && typeof action.type === 'string') {
        if (action.type === 'persist/PERSIST') {
          persistStartTs = Date.now();
          try {
            const keysCount = storage.getAllKeys().length;
            store.dispatch(
              LogActions.info(
                `persist/PERSIST start - storageKeys:${keysCount}`,
              ),
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
            store.dispatch(
              LogActions.info(
                `persist/REHYDRATE complete - durationMs:${took} totalSize:${totalSize} sizeByReduxKey:${JSON.stringify(
                  sizeByReduxKey,
                )}`,
              ),
            );
          } catch (_) {}
        }
      }
      return next(action);
    };
  };

  middlewares.push(persistLifecycleLogger());

  const middlewareEnhancers = __DEV__
    ? composeWithDevTools({trace: true, traceLimit: 25})(
        applyMiddleware(...middlewares),
      )
    : applyMiddleware(...middlewares);

  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  // Enable direct log dispatching now that the store exists
  storeDispatch = store.dispatch;

  // Clear any stale logs, and immediately flush any initLogs that were added before the store was initialized
  storeDispatch(LogActions.clear());
  initLogs.drainAndDispatch(storeDispatch);

  const persistor = persistStore(store);

  if (__DEV__) {
    // persistor.purge().then(() => console.log('purged persistence'));
  }

  return {
    store,
    persistor,
  };
};

export type RootState = ReturnType<typeof rootReducer>;

export type AppSelector<T = any> = Selector<RootState, T>;

export type Effect<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;

export function configureTestStore(initialState: any) {
  const middlewares = [thunkMiddleware];
  const middlewareEnhancers = composeWithDevTools({
    trace: true,
    traceLimit: 25,
  })(applyMiddleware(...middlewares));
  const store = createStore(rootReducer, initialState, middlewareEnhancers);
  return store as Store<RootState, AnyAction> & {
    dispatch: AppDispatch;
  };
}

export async function getEncryptionKey(): Promise<string> {
  const encryptionKeyId = 'bitpay-app-encryption-key';

  try {
    initLogs.add(
      LogActions.info('getEncryptionKey: attempting to retrieve from Keychain'),
    );
    const existingKey = await Keychain.getGenericPassword({
      service: encryptionKeyId,
    });

    if (existingKey && existingKey.password) {
      initLogs.add(
        LogActions.info('getEncryptionKey: found existing key in Keychain'),
      );
      return existingKey.password;
    }
  } catch (err) {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(
          `getEncryptionKey: Keychain get failed - ${getErrorString(err)}`,
        ),
      ),
    );
  }

  initLogs.add(
    LogActions.warn('getEncryptionKey: generating new key (no existing key)'),
  );
  const newKey = getUniqueId();

  try {
    // Save to keychain
    await Keychain.setGenericPassword(encryptionKeyId, newKey, {
      service: encryptionKeyId,
    });
    initLogs.add(
      LogActions.info('getEncryptionKey: stored new key in Keychain'),
    );
  } catch (err) {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(
          `getEncryptionKey: Keychain set failed - ${getErrorString(err)}`,
        ),
      ),
    );
  }

  return newKey;
}
