import {DISABLE_DEVELOPMENT_LOGGING} from '@env';
import {
  Action,
  AnyAction,
  Store,
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
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
import {
  walletConnectReducer,
  walletConnectV2Reducer,
  walletConnectV2ReduxPersistBlackList,
} from './wallet-connect-v2/wallet-connect-v2.reducer';

import {Storage} from 'redux-persist';
import {MMKV} from 'react-native-mmkv';
import {AppDispatch} from '../utils/hooks';
import {
  ZenledgerReduxPersistBlackList,
  zenledgerReducer,
} from './zenledger/zenledger.reducer';

export const storage = new MMKV();

export const reduxStorage: Storage = {
  setItem: (key, value) => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: key => {
    const value = storage.getString(key);
    return Promise.resolve(value);
  },
  removeItem: key => {
    storage.delete(key);
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

const rootReducer = combineReducers(reducers);

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
  const middlewares = [thunkMiddleware];

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

  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools({trace: true, traceLimit: 25})(
      middlewareEnhancers,
    );
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
        if (typeof key === 'string' && reducerPersistBlackLists[key]) {
          const reducerPersistBlackList = reducerPersistBlackLists[key];
          const fieldOverrides = (reducerPersistBlackList as string[]).reduce(
            (allFields, field) => ({...allFields, ...{[field]: undefined}}),
            {},
          );

          return {...inboundState, ...fieldOverrides};
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
  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
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

  const existingKey = await Keychain.getGenericPassword({
    service: encryptionKeyId,
  });

  if (existingKey && existingKey.password) {
    return existingKey.password;
  }

  const newKey = getUniqueId();
  // Save to keychain
  await Keychain.setGenericPassword(encryptionKeyId, newKey, {
    service: encryptionKeyId,
  });

  return newKey;
}
