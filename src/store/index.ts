import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createLogger} from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {getUniqueId} from 'react-native-device-info';
import {persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import {encryptTransform} from 'redux-persist-transform-encrypt'; // https://github.com/maxdeviant/redux-persist-transform-encrypt
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import {bindWalletClient, bindWalletKeys} from './transforms/transforms';

import {
  appReducer,
  appReduxPersistBlackList,
  AppState,
} from './app/app.reducer';
import {AppActionType} from './app/app.types';
import {
  bitPayIdReducer,
  bitPayIdReduxPersistBlackList,
  BitPayIdState,
} from './bitpay-id/bitpay-id.reducer';
import {BitPayIdActionType} from './bitpay-id/bitpay-id.types';
import {
  cardReducer,
  cardReduxPersistBlacklist,
  CardState,
} from './card/card.reducer';
import {CardActionType} from './card/card.types';
import {
  logReducer,
  logReduxPersistBlackList,
  LogState,
} from './log/log.reducer';
import {LogActionType} from './log/log.types';
import {
  shopReducer,
  shopReduxPersistBlackList,
  ShopState,
} from './shop/shop.reducer';
import {ShopActionType} from './shop/shop.types';
import {
  walletReducer,
  walletReduxPersistBlackList,
  WalletState,
} from './wallet/wallet.reducer';
import {WalletActionType} from './wallet/wallet.types';

const basePersistConfig = {
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
};

/*
 * Create a rootReducer using combineReducers
 * Set persist config for each and import blacklist to omit values
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const reducers = {
  APP: persistReducer<AppState, AppActionType>(
    {
      ...basePersistConfig,
      key: 'APP',
      blacklist: appReduxPersistBlackList,
    },
    appReducer,
  ),
  BITPAY_ID: persistReducer<BitPayIdState, BitPayIdActionType>(
    {
      ...basePersistConfig,
      key: 'BITPAY_ID',
      blacklist: bitPayIdReduxPersistBlackList,
    },
    bitPayIdReducer,
  ),
  CARD: persistReducer<CardState, CardActionType>(
    {
      ...basePersistConfig,
      key: 'CARD',
      blacklist: cardReduxPersistBlacklist,
    },
    cardReducer,
  ),
  LOG: persistReducer<LogState, LogActionType>(
    {
      ...basePersistConfig,
      key: 'LOG',
      blacklist: logReduxPersistBlackList,
    },
    logReducer,
  ),
  SHOP: persistReducer<ShopState, ShopActionType>(
    {
      ...basePersistConfig,
      key: 'SHOP',
      blacklist: shopReduxPersistBlackList,
    },
    shopReducer,
  ),
  WALLET: persistReducer<WalletState, WalletActionType>(
    {
      storage: AsyncStorage,
      transforms: [bindWalletClient, bindWalletKeys],
      key: 'WALLET',
      blacklist: walletReduxPersistBlackList,
    },
    walletReducer,
  ),
};

const rootReducer = combineReducers(reducers);

const getStore = () => {
  const middlewares = [
    thunkMiddleware,
    createLogger({
      predicate: (getState, action) =>
        ![
          'LOG/ADD_LOG',
          'APP/SET_CURRENT_ROUTE',
          'persist/REHYDRATE',
          'persist/PERSIST',
        ].includes(action.type),
    }),
  ];
  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools({trace: true, traceLimit: 25})(
      middlewareEnhancers,
    );
  }

  const rootPersistConfig = {
    ...basePersistConfig,
    key: 'root',
    // override all stores as they will handle their own blacklisting of certain values
    blacklist: Object.keys(reducers),
    transforms: [
      encryptTransform({
        secretKey: getUniqueId(),
        onError: error => {
          console.debug(error);
        },
      }),
    ],
  };

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  const persistor = persistStore(store);

  if (__DEV__) {
    persistor.purge().then(() => console.log('purged persistence'));
  }

  return {
    store,
    persistor,
  };
};

export type RootState = ReturnType<typeof rootReducer>;

export type Effect<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;

export function configureTestStore(initialState: any) {
  return createStore(rootReducer, initialState);
}
